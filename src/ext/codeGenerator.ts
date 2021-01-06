import { ParameterNode, NamedTypeNode, FieldDeclaration, TypeNode, NodeKind } from "../ast";
import { FunctionPrototype, ClassPrototype, ElementKind, DeclaredElement, FieldPrototype } from "../program";
import { Indent } from "./primitiveutil";
import { TypeNodeAnalyzer, AstUtil } from "./astutil";

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


  static getWrapperType(asType: string): string | undefined {
    return ExportGenerator.typeWrapperMap.get(asType);
  }

  /**
   * function isSelectorEqual(l: u8[], r: u8[]): boolean {
  if (l.length != r.length) return false;
  for (let i = 0; i < l.length; i++) {
    if (l[i] != r[i]) return false;
  }
  return true;
}
   */
  generateEqualMethod(): Indent {
    let indent = new Indent();
    indent.add(`function isSelectorEqual(l: u8[], r: u8[]): boolean {`).increase();
    indent.add(`if (l.length != r.length) return false`);
    indent.add(`for (let i = 0; i < l.length; i++) {`).increase();
    indent.add(`if (l[i] != r[i]) return false;`);
    indent.decrease().add(`}`);
    indent.add(`return true;`);
    indent.decrease().add(`}`);
    return indent;
  }

  generateDeployMethod(): Indent {
    let deployIndent = new Indent();
    deployIndent.add(`export function deploy(): i32 {`).increase();
    deployIndent.add(`const reader = MessageInputReader.readInput();`);
    deployIndent.add(`const fnSelector = reader.fnSelector;`);
    deployIndent.add(`let ${this.instanceName} = new ${this.className}();`);

    if (this.classPrototype.instanceMembers) {
      for (let [key, instance] of this.classPrototype.instanceMembers) {
        if (instance && AstUtil.isDeployerFnPrototype(instance)) {
          let method = ExportGenerator.generateCondition(this.instanceName, <FunctionPrototype>instance);
          deployIndent.addAll(method.getContent());
        }
      }
    }
    deployIndent.decrease().add(`}`);
    return deployIndent;
  }

  generateCallMethod(): Indent {
    let callIndent = new Indent();
    callIndent.add(`export function call(): i32 {`).increase();
    callIndent.add(`const reader = MessageInputReader.readInput();`);
    callIndent.add(`const fnSelector = reader.fnSelector;`);
    callIndent.add(`let ${this.instanceName} = new ${this.className}();`);

    if (this.classPrototype.instanceMembers) {
      for (let [key, instance] of this.classPrototype.instanceMembers) {
        if (instance && AstUtil.isActionFnPrototype(instance)) {
          let method = ExportGenerator.generateCondition(this.instanceName, <FunctionPrototype>instance);
          callIndent.addAll(method.getContent());
        }
      }
    }
    callIndent.decrease().add(`}`);
    return callIndent;
  }

  static generateCondition(instaceName: string, funcProto: FunctionPrototype): Indent {
    let params = funcProto.functionTypeNode.parameters; // FunctionDeclaration parameter types
    let funcName = funcProto.name;
    let paramters = [];
    let indent: Indent = new Indent(1);
    indent.add(`const ${funcName}selector: u8[] = [];`);
    indent.add(`if (isSelectorEqual(fnSelector, ${funcName}selector)) {`).increase();
    for (let index = 0; index < params.length; index++) {
      let type: ParameterNode = params[index];
      let parameterType = type.type.range.toString();
      let parameterName = type.name.range.toString();
      // console.log("parameterType", parameterType);
      // console.log("parameterName", parameterName);
      indent.add(`const p${index} = reader.fnParameters;`);
      indent.add(`const v${index} = ${ExportGenerator.typeWrapperMap.get(parameterType)}.fromU8a(p${index}).unwrap();`);
      paramters.push(`v${index}`);
    }

    let returnType = funcProto.functionTypeNode.returnType;
    let rtnNodeAnly = new TypeNodeAnalyzer(funcProto, <NamedTypeNode>returnType);

    if (rtnNodeAnly.isVoid()) {
      indent.add(`${instaceName}.${funcName}(${paramters.join(",")});`);
    } else {
      let wrapType = ExportGenerator.typeWrapperMap.get(rtnNodeAnly.typeName);
      indent.add(`const rs = ${instaceName}.${funcName}(${paramters.join(",")});`);
      indent.add(`ReturnData.set<${wrapType}>(new ${wrapType}(rs));`);
    }
    indent.decrease().add(`}`);
    // console.log(indent.toString());
    return indent;
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