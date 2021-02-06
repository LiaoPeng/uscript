import { ClassPrototype, FunctionPrototype, Program } from "../../program";
import { ClassInterperter, ContractIntperter, StorageInterpreter } from "../annotation";
import { ElementUtil, NamedTypeNodeDef } from "../astutil";
import { FieldDef } from "../contract";
import { CellLayoutDef } from "./storage";

/**
 * The parameter type enum
 * basic type and composite type, array and map. 
 * 
 */
export enum TypeEnum {
  NUMBER,
  STRING,
  ARRAY,
  MAP,
  CLASS
}
export class FunctionDef {
  private functionPrototype: FunctionPrototype;
  methodName: string = "";
  parameters: NamedTypeNodeDef[] = new Array();
  hasReturnVal: boolean = false;
  returnType: NamedTypeNodeDef | undefined;
  defaultVals: string[] = new Array();
  ctrDefaultVals: string = "";

  constructor(funcPrototype: FunctionPrototype) {
    this.functionPrototype = funcPrototype;
  }
}

export class TypeUtil {

  static typeWrapperMap: Map<string, string> = new Map([
    ["i8", "Int8"],
    ["i16", "Int16"],
    ["i32", "Int32"],
    ["i64", "Int64"],
    ["isize", "Int32"],
    ["u8", "UInt8"],
    ["u16", "UInt16"],
    ["u32", "UInt32"],
    ["u64", "UInt64"],
    ["usize", "UInt32"],
    ["f32", "float32"],
    ["f64", "float64"],
    ["bool", "Bool"],
    ["boolean", "Bool"],
    ["string", "String"]
  ]);

  static defaultValMap: Map<string, string> = new Map([
    ["i8", "0"],
    ["i16", "0"],
    ["i32", "0"],
    ["i64", "0"],
    ["isize", "0"],
    ["u8", "0"],
    ["u16", "0"],
    ["u32", "0"],
    ["u64", "0"],
    ["usize", "0"],
    ["f32", "0"],
    ["f64", "0"],
    ["bool", "false"],
    ["boolean", "false"],
    ["string", "''"]
  ]);

  static getWrapperType(asType: string): string {
    let type: string | undefined = TypeUtil.typeWrapperMap.get(asType);
    return type == undefined ? "" : type;
  }

  static getDefaultVal(asType: string): string {
    let type: string | undefined = TypeUtil.defaultValMap.get(asType);
    return type == undefined ? "" : type;
  }
}

export class ContractProgram {
  program: Program;
  contract: ContractIntperter | null;
  storages: StorageInterpreter[] = new Array();
  types: NamedTypeNodeDef[] = new Array();
  fields: FieldDef[] = new Array();
  private typeNodeMap: Map<string, NamedTypeNodeDef> = new Map<string, NamedTypeNodeDef>();
  private lastTypeSeq: i32 = 0;
  

  constructor(program: Program) {
    this.program = program;
    this.contract = null;
    this.resolve();
  }

  private resolve(): void {
    for (let [key, element] of this.program.elementsByName) {
      // find class 
      if (ElementUtil.isContractClassPrototype(element)) {
        this.contract = new ContractIntperter(<ClassPrototype>element);
      }
      if (ElementUtil.isStoreClassPrototype(element)) {
        this.storages.push(new StorageInterpreter(<ClassPrototype>element));
      }
    }
    this.resolveTypes();
  }

  private getIndexNum(): i32 {
    return ++this.lastTypeSeq;
  }

  private retriveTypesAndSetIndex(exportMethod: FunctionDef): void {
    exportMethod.parameters.forEach(item => {
      let originalType = item.originalType;
      if (!this.typeNodeMap.has(originalType)) {
        item.index = this.getIndexNum();
        this.typeNodeMap.set(originalType, item);
      }
      item.index = this.getIndexOfAbiTypes(originalType);
    });
  }

  private getIndexOfAbiTypes(originalType: string): i32 {
    let typeDef = this.typeNodeMap.get(originalType);
    return typeDef == undefined ? 0 : typeDef.index;
  }

  private resolveTypes(): void {
    if (this.contract) {
      for (let index = 0; index < this.contract.cntrFuncDefs.length; index++) {
        let exportDef: FunctionDef = this.contract.cntrFuncDefs[index];
        this.retriveTypesAndSetIndex(exportDef);
      }

      for (let index = 0; index < this.contract.msgFuncDefs.length; index++) {
        let exportDef: FunctionDef = this.contract.msgFuncDefs[index];
        this.retriveTypesAndSetIndex(exportDef);
      }
    }
  
    for (let index = 0; index < this.storages.length; index++) {
      let storeDef: StorageInterpreter = this.storages[index];
      storeDef.fields.forEach(item => {
        let originalType = item.fieldType;
        if (!this.typeNodeMap.has(originalType) && item.type) {
          item.type.index = this.getIndexNum();
          this.typeNodeMap.set(originalType, item.type);
        }
        let typeDef = this.typeNodeMap.get(originalType);
        let cellLayoutDef: CellLayoutDef = new CellLayoutDef();
        item.layout = cellLayoutDef;
        if (typeDef) {
          cellLayoutDef.cell.ty = typeDef.index;
          cellLayoutDef.cell.key = item.storeKey;
        }
      });
    }
    for (let [key, value] of this.typeNodeMap) {
      this.types.push(value);
    }
  }
}