import { FunctionPrototype, ClassPrototype, ElementKind, DeclaredElement, FieldPrototype, Program } from "../program";
import { Range } from "../tokenizer";
import { ElementUtil } from "./astutil";
import { FunctionDef, FieldDef, ImportSourceDef, NamedTypeNodeDef } from "./contract/base";
import { Strings } from "./primitiveutil";

export class ClassInterperter {
  protected classPrototype: ClassPrototype;
  className: string;
  instanceName: string;
  range: Range;
  
  constructor(clzPrototype: ClassPrototype) {
    this.classPrototype = clzPrototype;
    this.className = clzPrototype.name;
    this.instanceName = "_" + this.className.toLowerCase();
    this.range = this.classPrototype.declaration.range;
  }
}

export class ContractIntperter extends ClassInterperter {
  contractName: string;
  version: string;
  cntrFuncDefs: FunctionDef[] = new Array();
  msgFuncDefs: FunctionDef[] = new Array();
  
  constructor(clzPrototype: ClassPrototype)  {
    super(clzPrototype);
    this.contractName = Strings.lowerFirstCase(this.className);
    this.version = "1.0";
    this.resolveContractClass();
  }

  private resolveContractClass(): void {
    if (this.classPrototype && this.classPrototype.instanceMembers) {
      for (let [key, instance] of this.classPrototype.instanceMembers) {
        if (instance && ElementUtil.isCntrFuncPrototype(instance)) {
          this.cntrFuncDefs.push(new FunctionDef(<FunctionPrototype>instance));
        }
        if (instance && ElementUtil.isMessageFuncPrototype(instance)) {
          this.msgFuncDefs.push(new FunctionDef(<FunctionPrototype>instance));
        }
      }
    }
  }
}

export class StorageInterpreter extends ClassInterperter {

  fields: FieldDef[] = new Array();
  constructor(clzPrototype: ClassPrototype) {
    super(clzPrototype);
    this.classPrototype = clzPrototype;
    // console.log(`storage`, this.classPrototype.declaration.range.toString());
    clzPrototype.declaration.range.toString();
    if (this.classPrototype.instanceMembers) {
      this.resolveInstanceMembers(this.classPrototype.instanceMembers);
    }
  }

  resolveInstanceMembers(instanceMembers: Map<string, DeclaredElement>): void {
    for (let [fieldName, element] of instanceMembers) {
      if (element.kind == ElementKind.FIELD_PROTOTYPE) {
        this.fields.push(new FieldDef(<FieldPrototype>element));
      }
    }
  }
}

export class ContractProgram {
  program: Program;
  contract: ContractIntperter | null;
  storages: StorageInterpreter[] = new Array();
  types: NamedTypeNodeDef[] = new Array();
  fields: FieldDef[] = new Array();
  imports: ImportSourceDef;
  
  private typeNodeMap: Map<string, NamedTypeNodeDef> = new Map<string, NamedTypeNodeDef>();
  private lastTypeSeq: i32 = 0;

  constructor(program: Program) {
    this.program = program;
    this.contract = null;
    this.imports = new ImportSourceDef(program.sources);
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


  private setIndexOfNamedTypeNode(item: NamedTypeNodeDef): void {
    let originalType = item.originalType;
    if (!this.typeNodeMap.has(originalType)) {
      item.index = this.getIndexNum();
      this.typeNodeMap.set(originalType, item);
    } else {
      item.index = this.getIndexOfType(originalType);
    }
  }

  private retriveTypesAndSetIndex(exportMethod: FunctionDef): void {
    exportMethod.parameters.forEach(item => {
      this.setIndexOfNamedTypeNode(item);
    });
  }

  private getIndexOfType(originalType: string): i32 {
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
      });
    }
    for (let [key, value] of this.typeNodeMap) {
      this.types.push(value);
    }
  }
}