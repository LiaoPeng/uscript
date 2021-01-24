import { ParameterNode, NamedTypeNode, FieldDeclaration, TypeNode, NodeKind } from "../ast";
import { FunctionPrototype, ClassPrototype, ElementKind, DeclaredElement, FieldPrototype } from "../program";
import { TypeNodeAnalyzer, AstUtil, TypeNodeDesc } from "./astutil";
import { ExportDef, ExportMethod, StorageDef, FieldDef } from "./abi";

export class ContractGenerator {

  private classPrototype: ClassPrototype;
  private className: string;
  private instanceName: string;

  constructor(clzPrototype: ClassPrototype) {
    this.classPrototype = clzPrototype;
    let className: string = clzPrototype.name;
    let instanceName: string = "_" + className;
    this.className = className;
    this.instanceName = instanceName;
  }

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


  private getWrapperType(asType: string): string {
    let type: string | undefined =  ContractGenerator.typeWrapperMap.get(asType);
    return type == undefined ? "" : type;
  }

  private getDefaultVal(asType: string): string {
    let type: string | undefined = ContractGenerator.typeWrapperMap.get(asType);
    return type == undefined ? "" : type;
  }

  generateExportDef(): ExportDef {
    let deployDef: ExportDef = new ExportDef(this.className);
    if (this.classPrototype.instanceMembers) {
      for (let [_, instance] of this.classPrototype.instanceMembers) {
        if (instance && AstUtil.isDeployerFnPrototype(instance)) {
          let method = this.generateMethod(this.instanceName, <FunctionPrototype>instance);
          let defaultMthod = new ExportMethod();
          defaultMthod.methodName = "default";
          defaultMthod.paramters = [];
          deployDef.deployers.push(method);
          deployDef.deployers.push(defaultMthod);
        } else if (instance && AstUtil.isActionFnPrototype(instance)){
          let method = this.generateMethod(this.instanceName, <FunctionPrototype>instance);
          deployDef.messages.push(method);
        }
      }
    }
    return deployDef;
  }

  generateMethod(instaceName: string, funcProto: FunctionPrototype): ExportMethod {
    let deployMethod: ExportMethod = new ExportMethod();
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
      paramDesc.codecType = this.getWrapperType(parameterType)
      paramDesc.defaultVal = this.getDefaultVal(parameterType);
      deployMethod.paramters.push(paramDesc);

      // this.
    }
    let returnType = funcProto.functionTypeNode.returnType;
    let returnTypeAnalyzer = new TypeNodeAnalyzer(funcProto, <NamedTypeNode>returnType);
    let returnTypeDesc: TypeNodeDesc = new TypeNodeDesc();
    if (!returnTypeAnalyzer.isReturnVoid()) {
      let wrapType = this.getWrapperType(returnTypeAnalyzer.typeName);
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
      let key: string = varName;
      var typeNodeAnalyzer: TypeNodeAnalyzer = new TypeNodeAnalyzer(this.classPrototype, typeNode);
      let typeName = typeNodeAnalyzer.typeName;
      fieldDef.varName = varName;
      fieldDef.fieldType = typeName;
      fieldDef.name = fieldPrototype.name;
      let wrapType = ContractGenerator.typeWrapperMap.get(typeName);
      fieldDef.fieldCodecType = wrapType;
      this.storageDef.fields.push(fieldDef);
    }
  }
}