import { ParameterNode, NamedTypeNode, FieldDeclaration, TypeNode, NodeKind } from "../ast";
import { FunctionPrototype, ClassPrototype, ElementKind, DeclaredElement, FieldPrototype } from "../program";
import { TypeNodeAnalyzer, AstUtil, TypeNodeDesc } from "./astutil";
import { ContractExportDef, StorageDef, FieldDef } from "./abi";
import { MethodDef, TypeUtil } from "./contract/base";
export class ContractInterperter {

  private classPrototype: ClassPrototype;
  private className: string;
  private instanceName: string;
  private exportDef: ContractExportDef;

  constructor(clzPrototype: ClassPrototype) {
    this.classPrototype = clzPrototype;
    let className: string = clzPrototype.name;
    this.className = className;
    this.instanceName = "_" + this.className.toLowerCase();
    this.exportDef = new ContractExportDef(this.className);
  }

  getExportMethods(): ContractExportDef {
    if (this.classPrototype.instanceMembers) {
      for (let [_, instance] of this.classPrototype.instanceMembers) {
        if (instance && AstUtil.isDeployerFnPrototype(instance)) {
          this.resolveDeployerFuncPrototype(<FunctionPrototype> instance);
        } 

        if (instance && AstUtil.isMessageFuncPrototype(instance)) {
          let method = this.getMethodDesc(<FunctionPrototype>instance);
          this.exportDef.messages.push(method);
        }
      }
    }
    return this.exportDef;
  }

  private resolveDeployerFuncPrototype(funcPrototype: FunctionPrototype) {
    let method = this.getMethodDesc(funcPrototype);
    this.exportDef.deployers.push(method);
    let defaultMthod = new MethodDef();
    if (method.paramters.length !== 0) {
      defaultMthod.paramters = [];
      method.paramters.forEach(item => {
        defaultMthod.defaultVals.push(item.defaultVal);
      })
      defaultMthod.ctrDefaultVals = defaultMthod.defaultVals.join(",");
      defaultMthod.methodName = method.methodName;
      this.exportDef.deployers.push(defaultMthod);
    }
  }

  getMethodDesc(funcProto: FunctionPrototype): MethodDef {
    let deployMethod: MethodDef = new MethodDef();
    let params = funcProto.functionTypeNode.parameters; // FunctionDeclaration parameter types
    deployMethod.methodName = funcProto.name;

    for (let index = 0; index < params.length; index++) {
      let type: ParameterNode = params[index];
      let paramDesc: TypeNodeDesc = new TypeNodeDesc();

      let parameterType = type.type.range.toString();
      let parameterName = type.name.range.toString();
      // console.log("parameterType", parameterType);
      // console.log("parameterName", parameterName);

      paramDesc.originalType = parameterType;
      paramDesc.codecType = TypeUtil.getWrapperType(parameterType)
      paramDesc.defaultVal = TypeUtil.getDefaultVal(parameterType);
      deployMethod.paramters.push(paramDesc);
    }
    let returnType = funcProto.functionTypeNode.returnType;
    let returnTypeAnalyzer = new TypeNodeAnalyzer(funcProto, <NamedTypeNode>returnType);
    let returnTypeDesc: TypeNodeDesc = new TypeNodeDesc();
    if (!returnTypeAnalyzer.isReturnVoid()) {
      let wrapType = TypeUtil.getWrapperType(returnTypeAnalyzer.typeName);
      returnTypeDesc.codecType = wrapType;
      returnTypeDesc.originalType = returnTypeAnalyzer.typeName;
      deployMethod.hasReturnVal = true;
    }
    deployMethod.returnType = returnTypeDesc;
    return deployMethod;
  }
}

export class StorageGenerator {

  private classPrototype: ClassPrototype;
  storageDef: StorageDef;

  constructor(clzPrototype: ClassPrototype) {
    this.storageDef = new StorageDef();
    this.classPrototype = clzPrototype;
    if (this.classPrototype.instanceMembers) {
      this.resolveInstanceMembers(this.classPrototype.instanceMembers);
    }
  }

  resolveInstanceMembers(instanceMembers: Map<string, DeclaredElement>): void {
    this.storageDef.className = this.classPrototype.name;
    for (let [fieldName, element] of instanceMembers) {
      if (element.kind == ElementKind.FIELD_PROTOTYPE) {
        // console.log("fieldName", fieldName);
        this.resolveFieldPrototype(<FieldPrototype>element);
      }
    }
  }

  resolveFieldPrototype(fieldPrototype: FieldPrototype): void {
    let fieldDeclaration: FieldDeclaration = <FieldDeclaration>fieldPrototype.declaration;
    let commonType: TypeNode | null = fieldDeclaration.type;
    if (commonType && commonType.kind == NodeKind.NAMEDTYPE) {
      let fieldDef: FieldDef = new FieldDef();
      let typeNode = <NamedTypeNode>commonType;
      let varName = "_" + fieldPrototype.name;
      let key: string = this.classPrototype.name + fieldPrototype.name;
      var typeNodeAnalyzer: TypeNodeAnalyzer = new TypeNodeAnalyzer(this.classPrototype, typeNode);
      let typeName = typeNodeAnalyzer.typeName;
      fieldDef.varName = varName;
      fieldDef.storeKey = key;
      fieldDef.fieldType = typeName;
      fieldDef.name = fieldPrototype.name;
      let wrapType = TypeUtil.getWrapperType(typeName);
      fieldDef.fieldCodecType = wrapType;
      fieldDef.storeKey = this.storageDef.className + fieldDef.name;
      this.storageDef.fields.push(fieldDef);
    }
  }
}