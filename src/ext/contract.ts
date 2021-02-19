import { FunctionPrototype, ClassPrototype, ElementKind, FieldPrototype, Program } from "../program";
import { Range } from "../tokenizer";
import { ElementUtil } from "./utils";
import { FunctionDef, FieldDef, ImportSourceDef, NamedTypeNodeDef, MessageFuctionDef } from "./contract/base";
import { Strings } from "./primitiveutil";
import { ProgramAnalyzar } from "./analyzer";

export class ClassInterpreter { 
  protected classPrototype: ClassPrototype;
  className: string;
  instanceName: string;
  range: Range;
  fields: FieldDef[] = new Array();

  constructor(clzPrototype: ClassPrototype) {
    this.classPrototype = clzPrototype;
    this.className = clzPrototype.name;
    this.instanceName = "_" + this.className.toLowerCase();
    this.range = this.classPrototype.declaration.range;
  }

  isExtends(): boolean {
    return this.classPrototype.basePrototype != null;
  }

  resolveInstanceMembers(): void {
    this.classPrototype.instanceMembers &&
      this.classPrototype.instanceMembers.forEach((element, _) => {
        if (element.kind == ElementKind.FIELD_PROTOTYPE) {
          this.fields.push(new FieldDef(<FieldPrototype>element));
        }
      });
  }
}

export class ContractInterpreter extends ClassInterpreter {
  name: string;
  version: string;
  cntrFuncDefs: FunctionDef[] = new Array();
  msgFuncDefs: FunctionDef[] = new Array();
  isReturnable: boolean = false;

  constructor(clzPrototype: ClassPrototype) {
    super(clzPrototype);
    this.name = Strings.lowerFirstCase(this.className);
    this.version = "1.0";
    this.instanceName = Strings.lowerFirstCase(this.className);
    this.resolveContractClass();
  }

  private resolveContractClass(): void {
    this.classPrototype.instanceMembers &&
      this.classPrototype.instanceMembers.forEach((instance, _) => {
        if (ElementUtil.isCntrFuncPrototype(instance)) {
          this.cntrFuncDefs.push(new FunctionDef(<FunctionPrototype>instance));
        }
        if (ElementUtil.isMessageFuncPrototype(instance)) {
          let msgFunc = new MessageFuctionDef(<FunctionPrototype>instance);
          this.isReturnable = this.isReturnable || msgFunc.isReturnable;
          this.msgFuncDefs.push(msgFunc);
        }
      });
  }

  public setTypeIndex(typeNodeMap: Map<string, NamedTypeNodeDef>): void {
    this.cntrFuncDefs.forEach(funcDef => {
      funcDef.setTypeIndex(typeNodeMap);
    });
    this.msgFuncDefs.forEach(funcDef => {
      funcDef.setTypeIndex(typeNodeMap);
    });
  }
}

export class EventInterpreter extends ClassInterpreter {

  constructor(clzPrototype: ClassPrototype) {
    super(clzPrototype);
    this.resolveInstanceMembers();
  }
}

export class StorageInterpreter extends ClassInterpreter {

  constructor(clzPrototype: ClassPrototype) {
    super(clzPrototype);
    this.resolveInstanceMembers();
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
  contract: ContractInterpreter | null = null;
  events: EventInterpreter[] = new Array();
  storages: StorageInterpreter[] = new Array();
  types: NamedTypeNodeDef[] = new Array();
  fields: FieldDef[] = new Array();
  import: ImportSourceDef;

  private typeNodeMap: Map<string, NamedTypeNodeDef> = new Map<string, NamedTypeNodeDef>();

  constructor(program: Program) {
    this.program = program;
    this.import = new ImportSourceDef(program.sources);
    this.resolve();
    this.sortStorages();
    this.getFields();
  }

  private sortStorages(): void {
    this.storages.sort((a: ClassInterpreter, b: ClassInterpreter): i32 => b.range.start - a.range.start);
  }

  private getFields(): void {
    this.storages.forEach(item => {
      item.fields.forEach(field => {
        this.fields.push(field);
      });
    });
  }

  private addDefaultImports(): void {
    this.import.toImportElement("FnParameters");
    this.import.toImportElement("Msg");
    this.import.toImportElement("Storage");
    if (this.contract && this.contract.isReturnable) {
      this.import.toImportElement("ReturnData");
    }
  }

  private resolve(): void {
    this.program.elementsByName.forEach((element, _) => {
      if (ElementUtil.isContractClassPrototype(element)) {
        console.log(`contract: ${element.name}`);
        this.contract = new ContractInterpreter(<ClassPrototype>element);
      }
      if (ElementUtil.isStoreClassPrototype(element)) {
        this.storages.push(new StorageInterpreter(<ClassPrototype>element));
      }
      if (ElementUtil.isEventClassPrototype(element)) {
        this.events.push(new EventInterpreter(<ClassPrototype>element));
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
    if (this.contract) {
      this.contract.setTypeIndex(this.typeNodeMap);
    }
    this.storages.forEach(storage => {
      storage.setTypeIndex(this.typeNodeMap);
    });
  }
}

export function getContractInfo(program: Program): ContractProgram {
  new ProgramAnalyzar(program);
  return new ContractProgram(program);
}
