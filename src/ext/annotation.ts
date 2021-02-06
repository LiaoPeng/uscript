import { ParameterNode, NamedTypeNode, Source } from "../ast";
import { FunctionPrototype, ClassPrototype, ElementKind, DeclaredElement, FieldPrototype } from "../program";
import { Range } from "../tokenizer";
import { NamedTypeNodeDef, ElementUtil } from "./astutil";
import { FieldDef } from "./contract";
import { FunctionDef, TypeUtil } from "./contract/base";
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
    // this.source.range.atStart
  }


  resolveCntrFuncPrototype(funcPrototype: FunctionPrototype): void {
    let method = this.getFunctionDesc(funcPrototype);
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

  getFunctionDesc(funcProto: FunctionPrototype): FunctionDef {
    let functionDef: FunctionDef = new FunctionDef(funcProto);
    let params = funcProto.functionTypeNode.parameters; // FunctionDeclaration parameter types
    functionDef.methodName = funcProto.name;

    for (let index = 0; index < params.length; index++) {
      let type: ParameterNode = params[index];
      let paramDesc: NamedTypeNodeDef = new NamedTypeNodeDef(funcProto, <NamedTypeNode>type.type);

      let parameterType = type.type.range.toString();
      let parameterName = type.name.range.toString();
      console.log("parameterType", parameterType);
      console.log("parameterName", parameterName);

      paramDesc.originalType = parameterType;
      paramDesc.codecType = TypeUtil.getWrapperType(parameterType);
      paramDesc.defaultVal = TypeUtil.getDefaultVal(parameterType);
      functionDef.parameters.push(paramDesc);
    }
    let returnType = funcProto.functionTypeNode.returnType;
    let returnTypeDesc = new NamedTypeNodeDef(funcProto, <NamedTypeNode>returnType);
    if (!returnTypeDesc.isReturnVoid()) {
      let wrapType = TypeUtil.getWrapperType(returnTypeDesc.typeName);
      returnTypeDesc.codecType = wrapType;
      returnTypeDesc.originalType = returnTypeDesc.typeName;
      functionDef.hasReturnVal = true;
    }
    functionDef.returnType = returnTypeDesc;
    return functionDef;
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