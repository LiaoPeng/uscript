import { FunctionPrototype, ClassPrototype, ElementKind, DeclaredElement, FieldPrototype } from "../program";
import { Range } from "../tokenizer";
import { ElementUtil } from "./astutil";
import { FunctionDef, FieldDef } from "./contract/base";
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

  resolveCntrFuncPrototype(funcPrototype: FunctionPrototype): void {
    // let method = this.getFunctionDesc(funcPrototype);
    // this.exportDef.deployers.push(method);
    // let defaultMthod = new FunctionDef();
    // if (method.paramters.length !== 0) {
    //   defaultMthod.paramters = [];
    //   method.paramters.forEach(item => {
    //     defaultMthod.defaultVals.push(item.defaultVal);
    //   });
    //   defaultMthod.ctrDefaultVals = defaultMthod.defaultVals.join(",");
    //   defaultMthod.methodName = method.methodName;
    //   this.exportDef.deployers.push(defaultMthod);
    // }
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
    console.log(`storage`, this.classPrototype.declaration.range.toString());
    clzPrototype.declaration.range.toString();
    if (this.classPrototype.instanceMembers) {
      this.resolveInstanceMembers(this.classPrototype.instanceMembers);
    }
  }

  resolveInstanceMembers(instanceMembers: Map<string, DeclaredElement>): void {
    for (let [fieldName, element] of instanceMembers) {
      if (element.kind == ElementKind.FIELD_PROTOTYPE) {
        this.resolveFieldPrototype(<FieldPrototype>element);
      }
    }
  }

  resolveFieldPrototype(fieldPrototype: FieldPrototype): void {
    this.fields.push(new FieldDef(fieldPrototype));
  }
}