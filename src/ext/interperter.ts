import { FunctionPrototype, ClassPrototype, ElementKind, DeclaredElement, FieldPrototype, Program } from "../program";
import { Range } from "../tokenizer";
import { ElementUtil } from "./utils";
import { FunctionDef, FieldDef, ImportSourceDef, NamedTypeNodeDef } from "./contract/base";
import { Strings } from "./primitiveutil";

export class ClassInterpreter {
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

export class ContractInterpreter extends ClassInterpreter {
  name: string;
  version: string;
  cntrFuncDefs: FunctionDef[] = new Array();
  msgFuncDefs: FunctionDef[] = new Array();
  isReturnable: boolean = false;
  
  constructor(clzPrototype: ClassPrototype)  {
    super(clzPrototype);
    this.name = Strings.lowerFirstCase(this.className);
    this.version = "1.0";
    this.instanceName = Strings.lowerFirstCase(this.className);
    this.resolveContractClass();
  }

  private resolveContractClass(): void {
    if (this.classPrototype && this.classPrototype.instanceMembers) {
      this.classPrototype.instanceMembers.forEach((instance, _) => {
        if (ElementUtil.isCntrFuncPrototype(instance)) {
          this.cntrFuncDefs.push(new FunctionDef(<FunctionPrototype>instance));
        }
        if (ElementUtil.isMessageFuncPrototype(instance)) {
          let msgFunc = new FunctionDef(<FunctionPrototype>instance);
          this.isReturnable = this.isReturnable || msgFunc.isReturnable;
          this.msgFuncDefs.push(msgFunc);
        }
      });
    }
  }

  public setTypeInde(typeNodeMap: Map<string, NamedTypeNodeDef>): void {
    this.cntrFuncDefs.forEach(funcDef => {
      funcDef.setTypeIndex(typeNodeMap);
    });
    this.msgFuncDefs.forEach(funcDef => {
      funcDef.setTypeIndex(typeNodeMap);
    });
  }
}

export class StorageInterpreter extends ClassInterpreter {

  fields: FieldDef[] = new Array();
  constructor(clzPrototype: ClassPrototype) {
    super(clzPrototype);
    if (this.classPrototype.instanceMembers) {
      this.resolveInstanceMembers(this.classPrototype.instanceMembers);
    }
  }

  resolveInstanceMembers(instanceMembers: Map<string, DeclaredElement>): void {
    instanceMembers.forEach((element, _) => {
      if (element.kind == ElementKind.FIELD_PROTOTYPE) {
        this.fields.push(new FieldDef(<FieldPrototype>element));
      }
    });
  }

  setTypeIndex(typeNodeMap: Map<string, NamedTypeNodeDef>): void {
    this.fields.forEach(item => {
      if (item.type) {
        item.type.setTypeIndex(typeNodeMap);
      }
    });
  }
}

export class ContractProgram {
  program: Program;
  contract: ContractInterpreter | null;
  storages: StorageInterpreter[] = new Array();
  types: NamedTypeNodeDef[] = new Array();
  fields: FieldDef[] = new Array();
  import: ImportSourceDef;
  
  private typeNodeMap: Map<string, NamedTypeNodeDef> = new Map<string, NamedTypeNodeDef>();

  constructor(program: Program) {
    this.program = program;
    this.contract = null;
    this.import = new ImportSourceDef(program.sources);
    this.resolve();
    this.sortStorages();
  }

  private sortStorages(): void {
    this.storages.sort((a: ClassInterpreter, b: ClassInterpreter): i32 => b.range.start - a.range.start);
  }
  
  private addDefaultImports(): void {
    this.import.toImportElement("FnParameters");
    this.import.toImportElement("Msg");
    this.import.toImportElement("Storage");
    if (this.contract!.isReturnable) {
      this.import.toImportElement("ReturnData");
    }
  }

  private resolve(): void {
    this.program.elementsByName.forEach((element, _) => {
      if (ElementUtil.isContractClassPrototype(element)) {
        this.contract = new ContractInterpreter(<ClassPrototype>element);
      }
      if (ElementUtil.isStoreClassPrototype(element)) {
        this.storages.push(new StorageInterpreter(<ClassPrototype>element));
      }
    });
    this.setTypeIndex();
    this.addDefaultImports();

    this.typeNodeMap.forEach((value, _) => {
      this.types.push(value);
      this.import.toImportElement(value.codecType);
    });
  }

  private setTypeIndex(): void {
    this.contract!.setTypeInde(this.typeNodeMap);
    this.storages.forEach(storage => {
      storage.setTypeIndex(this.typeNodeMap);
    });
  }
}