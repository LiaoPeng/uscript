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
  isReturnable: boolean = false;
  
  constructor(clzPrototype: ClassPrototype)  {
    super(clzPrototype);
    this.contractName = Strings.lowerFirstCase(this.className);
    this.version = "1.0";
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

  public calculateTypeIndex(typeNodeMap: Map<string, NamedTypeNodeDef>): void {
    for (let index = 0; index < this.cntrFuncDefs.length; index++) {
      this.cntrFuncDefs[index].calculateTypeIndex(typeNodeMap);
    }

    for (let index = 0; index < this.msgFuncDefs.length; index++) {
      this.msgFuncDefs[index].calculateTypeIndex(typeNodeMap);
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
    instanceMembers.forEach((element, _) => {
      if (element.kind == ElementKind.FIELD_PROTOTYPE) {
        this.fields.push(new FieldDef(<FieldPrototype>element));
      }
    });
  }

  calculateTypeIndex(typeNodeMap: Map<string, NamedTypeNodeDef>): void {
    this.fields.forEach(item => {
      if (item.type) {
        item.type.calculateTypeIndex(typeNodeMap);
      }
      // TODO 
      // this.import.addImportsElement(item.fieldCodecType);
    });
  }

}

export class ContractProgram {
  program: Program;
  contract: ContractIntperter | null;
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
  }

  private addDefaultImport(): void {
    this.import.addImportsElement("FnParameters");
    this.import.addImportsElement("Msg");
    this.import.addImportsElement("Storage");
    if (this.contract!.isReturnable) {
      this.import.addImportsElement("ReturnData");
    }
  }

  private resolve(): void {
    this.program.elementsByName.forEach((element, _) => {
      if (ElementUtil.isContractClassPrototype(element)) {
        this.contract = new ContractIntperter(<ClassPrototype>element);
      }
      if (ElementUtil.isStoreClassPrototype(element)) {
        this.storages.push(new StorageInterpreter(<ClassPrototype>element));
      }
    });
    this.resolveTypes();
    this.addDefaultImport();
  }

  private resolveTypes(): void {
    this.contract!.calculateTypeIndex(this.typeNodeMap);
    for (let index = 0; index < this.storages.length; index++) {
      this.storages[index].calculateTypeIndex(this.typeNodeMap);
    }
    this.typeNodeMap.forEach((value, _) => {
      this.types.push(value);
      this.import.addImportsElement(value.codecType);
    });
  }
}