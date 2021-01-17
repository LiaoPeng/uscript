import { ParameterNode, NamedTypeNode, FieldDeclaration, TypeNode, NodeKind } from "../ast";
import { FunctionPrototype, ClassPrototype, ElementKind, DeclaredElement, FieldPrototype } from "../program";
import { Indent } from "./primitiveutil";
import { TypeNodeAnalyzer, AstUtil, TypeNodeDesc } from "./astutil";
import { ExportDef, ExportMethod } from "./abi";

export class ExportGenerator {

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
    ["string", "string"]
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


  static getWrapperType(asType: string): string | undefined {
    return ExportGenerator.typeWrapperMap.get(asType);
  }

  generateExportDef(): ExportDef {
    let deployDef: ExportDef = new ExportDef(this.className);
    if (this.classPrototype.instanceMembers) {
      for (let [key, instance] of this.classPrototype.instanceMembers) {
        if (instance && AstUtil.isDeployerFnPrototype(instance)) {
          let method = ExportGenerator.generateMethod(this.instanceName, <FunctionPrototype>instance);
          deployDef.deployers.push(method);
        } else if (instance && AstUtil.isActionFnPrototype(instance)){
          let method = ExportGenerator.generateMethod(this.instanceName, <FunctionPrototype>instance);
          deployDef.messages.push(method);
        }
      }
    }
    return deployDef;
  }

  static generateMethod(instaceName: string, funcProto: FunctionPrototype): ExportMethod {
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
      paramDesc.codecType = ExportGenerator.typeWrapperMap.get(parameterType)
      paramDesc.defaultVal = ExportGenerator.defaultValMap.get(parameterType);
      deployMethod.paramters.push(paramDesc);
    }
    let returnType = funcProto.functionTypeNode.returnType;
    // console.log("returnType", returnType.range.toString())
    let rtnNodeAnly = new TypeNodeAnalyzer(funcProto, <NamedTypeNode>returnType);
    let returnTypeDesc: TypeNodeDesc = new TypeNodeDesc();
    if (!rtnNodeAnly.isVoid()) {
      let wrapType = ExportGenerator.typeWrapperMap.get(rtnNodeAnly.typeName);
      returnTypeDesc.codecType = wrapType;
      deployMethod.hasReturnVal = true;
    }
    deployMethod.returnType = returnTypeDesc;
    return deployMethod;
  }
}

export class StorageGenerator {

  private classPrototype: ClassPrototype;
  private fieldIndents: Indent[] = new Array<Indent>();
  private methodIndents: Indent[] = new Array<Indent>();

  constructor(clzPrototype: ClassPrototype) {
    this.classPrototype = clzPrototype;
    if (this.classPrototype.instanceMembers) {
      this.resolveInstanceMembers(this.classPrototype.instanceMembers);
    }
  }

  getBody(): Indent {
    let bodyIndent: Indent = new Indent();
    bodyIndent.add(`class ${this.classPrototype.name} {`);
    bodyIndent.joinIndents(this.fieldIndents).joinIndents(this.methodIndents);
    bodyIndent.add(`}`);
    return bodyIndent;
  }

  resolveInstanceMembers(instanceMembers: Map<string, DeclaredElement>): void {
    for (let [fieldName, element] of instanceMembers) {
      if (element.kind == ElementKind.FIELD_PROTOTYPE) {
        // console.log("fieldName", fieldName);
        this.resolveFieldPrototype(<FieldPrototype>element)
      }
    }
  }

  resolveFieldPrototype(fieldPrototype: FieldPrototype): void {
    let fieldDeclaration: FieldDeclaration = <FieldDeclaration>fieldPrototype.declaration;
    let commonType: TypeNode | null = fieldDeclaration.type;
    if (commonType && commonType.kind == NodeKind.NAMEDTYPE) {
      let typeNode = <NamedTypeNode>commonType;
      let varName = "_" + fieldPrototype.name;
      let key: string = varName;
      var typeNodeAnalyzer: TypeNodeAnalyzer = new TypeNodeAnalyzer(this.classPrototype, typeNode);
      let typeName = typeNodeAnalyzer.typeName;

      let field: Indent = new Indent(2);
      field.add(`private ${varName}: ${typeName} | null;`);
      this.fieldIndents.push(field);

      let getIndent = this.getField(fieldPrototype.name, key, typeNode);
      let setIndent = this.setFiled(fieldPrototype.name, key, typeNode);
      this.methodIndents.push(getIndent);
      this.methodIndents.push(setIndent);

      // console.log(`${field.toString()}`);
      // console.log(`${getIndent.toString()}`);
      // console.log(`${setIndent.toString()}`);
    }
  }

  getField(fieldName: string, key: string, typeNode: NamedTypeNode): Indent {
    var typeNodeAnalyzer: TypeNodeAnalyzer = new TypeNodeAnalyzer(this.classPrototype, typeNode);
    let typeName = typeNodeAnalyzer.typeName;
    let varName = "_" + fieldName;
    let wrapType = ExportGenerator.getWrapperType(typeName);
    var indent: Indent = new Indent(2);
    indent.add(`get ${fieldName}(): ${typeName} {`).increase();
    indent.add(`if (this.${varName} === null) {`).increase();
    indent.add(`const st = new Storage<${wrapType}>("${key}")`);
    indent.add(`this.${varName} = st.load();`);
    indent.decrease().add(`}`);
    indent.add(`return this.${varName}!.unwrap();`);
    indent.decrease().add(`}`);

    return indent;
  }

  setFiled(fieldName: string, key: string, typeNode: NamedTypeNode): Indent {
    var typeNodeAnalyzer: TypeNodeAnalyzer = new TypeNodeAnalyzer(this.classPrototype, typeNode);
    let typeName = typeNodeAnalyzer.typeName;
    let wrapType = ExportGenerator.getWrapperType(typeName);
    var indent: Indent = new Indent(2);
    let varName = "_" + fieldName;
    indent.add(`set ${fieldName}(v: ${typeName}) {`).increase();
    indent.add(`this.${varName} = new ${wrapType}(v);`);
    indent.add(`const st = new Storage<${wrapType}>("${key}");`);
    indent.add(`st.store(this.${varName});`);
    indent.decrease().add(`}`);
    return indent;
  }
}