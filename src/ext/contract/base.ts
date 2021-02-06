import { FieldDeclaration, ImportStatement, NamedTypeNode, NodeKind, ParameterNode, Source, SourceKind, TypeDeclaration, TypeNode } from "../../ast";
import { Element, ElementKind, FieldPrototype, FunctionPrototype, TypeDefinition } from "../../program";
import { AstUtil } from "../astutil";
import { Collections } from "../collectionutil";
import { AbiHelper } from "../contract";
import { LayoutDef } from "./storage";

/**
 * The parameter type enum
 * basic type and composite type, array and map. 
 * 
 */
export enum TypeEnum {
  NUMBER,
  STRING,
  ARRAY,
  MAP,
  CLASS
}
export class FieldDef {
  protected fieldPrototype: FieldPrototype;
  layout: LayoutDef = new LayoutDef();
  name: string = "";
  type: NamedTypeNodeDef | null = null;
  fieldType: string = "";
  fieldCodecType: string | undefined = "";
  storeKey: string = "";
  varName: string = "";
  path: string = "";

  constructor(field: FieldPrototype) {
    this.fieldPrototype = field;
    this.name = field.name;
    this.varName = "_" + this.name;
    this.storeKey = this.fieldPrototype.parent.name + this.name;
    this.resolveField();
  }

  private resolveField(): void {
    let fieldDeclaration: FieldDeclaration = <FieldDeclaration>this.fieldPrototype.declaration;
    let commonType: TypeNode | null = fieldDeclaration.type;
    if (commonType && commonType.kind == NodeKind.NAMEDTYPE) {
      let typeNode = <NamedTypeNode>commonType;
      this.type = new NamedTypeNodeDef(this.fieldPrototype, typeNode);
      let typeName = this.type.typeName;
      this.fieldType = typeName;
      let wrapType = TypeUtil.getWrapperType(typeName);
      this.fieldCodecType = wrapType;
    }
  }
}

export class FunctionDef {
  private funcProto: FunctionPrototype;
  methodName: string = "";
  parameters: NamedTypeNodeDef[] = new Array();
  hasReturnVal: boolean = false;
  returnType: NamedTypeNodeDef | undefined;
  defaultVals: string[] = new Array();
  ctrDefaultVals: string = "";

  constructor(funcPrototype: FunctionPrototype) {
    this.funcProto = funcPrototype;
    this.methodName = this.funcProto.name;
    this.resolve();
  }

  resolve(): void {
    let params = this.funcProto.functionTypeNode.parameters; // FunctionDeclaration parameter types

    for (let index = 0; index < params.length; index++) {
      let type: ParameterNode = params[index];
      let paramDesc: NamedTypeNodeDef = new NamedTypeNodeDef(this.funcProto, <NamedTypeNode>type.type);

      let parameterType = type.type.range.toString();
      let parameterName = type.name.range.toString();
      console.log("parameterType", parameterType);
      console.log("parameterName", parameterName);

      paramDesc.originalType = parameterType;
      paramDesc.codecType = TypeUtil.getWrapperType(parameterType);
      paramDesc.defaultVal = TypeUtil.getDefaultVal(parameterType);
      this.parameters.push(paramDesc);
    }
    let returnType = this.funcProto.functionTypeNode.returnType;
    let returnTypeDesc = new NamedTypeNodeDef(this.funcProto, <NamedTypeNode>returnType);
    if (!returnTypeDesc.isReturnVoid()) {
      let wrapType = TypeUtil.getWrapperType(returnTypeDesc.typeName);
      returnTypeDesc.codecType = wrapType;
      returnTypeDesc.originalType = returnTypeDesc.typeName;
      this.hasReturnVal = true;
    }
    this.returnType = returnTypeDesc;
  }
}

export class TypeUtil {

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

  static getWrapperType(asType: string): string {
    let type: string | undefined = TypeUtil.typeWrapperMap.get(asType);
    return type == undefined ? "" : type;
  }

  static getDefaultVal(asType: string): string {
    let type: string | undefined = TypeUtil.defaultValMap.get(asType);
    return type == undefined ? "" : type;
  }
}
export class ImportSourceDef {
  private entrySources: Source[] = new Array();
  private importedElement: Set<String> = new Set();
  unimports: Set<String> = new Set();

  constructor(sources: Source[]) {
    sources.forEach(element => {
      if (element.sourceKind == SourceKind.USER_ENTRY) {
        this.entrySources.push(element);
        this.resolveSource(element);
      }
    });
  }

  private resolveSource(source: Source): void {
    source.statements.forEach(statement => {
      if (statement.kind == NodeKind.IMPORT) {
        let importStatement = <ImportStatement> statement;
        if (importStatement.declarations) {
          importStatement.declarations.forEach(declaration => {
            console.log(declaration.range.toString());
            this.importedElement.add(declaration.range.toString());
          });
        }
      }
    });
  }

  addImportsElement(name: String): void {
    if (!this.importedElement.has(name)) {
      this.unimports.add(name);
    }
  }
}


/**
 * Type node description
 * 
 * How to describe a type, 
 * basic type, type name and type
 * composite type 
 * array and map
 * 
 * method(name: string);
 * method(name: string, car: Car);
 */
export class NamedTypeNodeDef {
  protected parent: Element;
  protected typeNode: NamedTypeNode;
  typeKind: TypeEnum | undefined;
  typeArguments: NamedTypeNodeDef[] = new Array();
  typeName: string = "";
  codecType: string = "";
  originalType: string = "";
  defaultVal: string = "";
  index: i32 = 0;

  constructor(parent: Element, typeNode: NamedTypeNode) {
    this.parent = parent;
    this.typeNode = typeNode;
    console.log("type node kind", NodeKind[this.typeNode.kind]);
    // Here various clz[]'s type name is [], not clz.
    this.typeName = this.typeNode.name.range.toString();
    console.log("typename", this.typeName);
    this.getArgs();
  }

  getDeclareType(): string {
    return this.typeNode.range.toString();
  }

  isReturnVoid(): boolean {
    return this.typeName == "void";
  }

  get typeEnum(): TypeEnum {
    var typeName = this.typeName;
    if (AstUtil.isString(typeName)) {
      return TypeEnum.STRING;
    }
    if (AstUtil.isArrayType(typeName)) {
      return TypeEnum.ARRAY;
    }
    if (AstUtil.isMapType(typeName)) {
      return TypeEnum.MAP;
    }
    var type = this.findElement(typeName);

    if (type) {
      if (type.kind == ElementKind.TYPEDEFINITION) {
        let typeDefine = <TypeDefinition>type;
        let declaration = <TypeDeclaration>typeDefine.declaration;
        let _typeNode = <NamedTypeNode>declaration.type;
        let name = _typeNode.name.range.toString();
        if (AbiHelper.abiTypeLookup.get(name) && name != "Asset") {
          return TypeEnum.NUMBER;
        }
      }
      if (type.kind == ElementKind.CLASS_PROTOTYPE) {
        return TypeEnum.CLASS;
      }
    }
    return TypeEnum.NUMBER;
  }

  isArray(): boolean {
    return this.typeEnum == TypeEnum.ARRAY;
  }

  getArrayArgAbiTypeEnum(): TypeEnum {
    var typeName = this.getArgs()[0];
    if (AstUtil.isString(typeName)) {
      return TypeEnum.STRING;
    }
    var type = this.findSourceAsElement(typeName);
    if (type != null && type.kind == ElementKind.CLASS_PROTOTYPE) {
      return TypeEnum.CLASS;
    }
    return TypeEnum.NUMBER;
  }

  isPrimaryType(): boolean {
    if (this.typeEnum == TypeEnum.NUMBER) {
      return this.findSourceAsTypeName(this.typeName) == "u64";
    }
    return false;
  }

  getArrayArg(): string {
    if (this.typeNode.typeArguments) {
      return this.typeNode.typeArguments[0].range.toString();
    }
    throw new Error(`The typenode is not array:${this.typeName}.`
      + ` Location in ${AstUtil.location(this.typeNode.range)}`);
  }

  getAbiDeclareType(): string {
    var abiType = this.typeEnum;
    var typeName = this.typeNode.name.range.toString();
    switch (abiType) {
      case TypeEnum.STRING: {
        return "string";
      }
      case TypeEnum.NUMBER:
      case TypeEnum.CLASS: {
        return typeName;
      }
      case TypeEnum.ARRAY: {
        return `${this.getArgs()[0]}[]`;
      }
      case TypeEnum.MAP: {
        return `${this.getArgs().join(",")}{}`;
      }
      default: {
        return typeName;
      }
    }
  }

  private getArgs(): string[] {
    var args = this.typeNode.typeArguments;
    var argType = new Array<string>();
    if (args) {
      for (let arg of args) {
        console.log(`arg node type kind`, NodeKind[arg.kind]);
        if (arg.kind == NodeKind.NAMEDTYPE) {
          let typeAnalyzer: NamedTypeNodeDef = new NamedTypeNodeDef(this.parent, <NamedTypeNode>arg);
          this.typeArguments.push(typeAnalyzer);
        }
        argType.push(arg.range.toString());
      }
    }
    return argType;
  }

  getAsTypes(): string[] {
    var args = this.getArgs();
    if (!Collections.isEmptyArray(args)) {
      return args;
    }
    return [this.typeName];
  }

  /**
  * the typename maybe global scope or local scope.
  * So search the local firtst, then search the global scope.
  *
  * @param typeName typename without type arguments
  */
  findElement(typeName: string): Element | null {
    return this.parent.lookup(typeName);
  }

  /**
   * Get the type {@type Type} by the type name
   * @param asTypeName the AssemblyScript type name
   */
  private findSourceAsElement(asTypeName: string): Element | null {
    var sourceTypeName = this.findSourceAsTypeName(asTypeName);
    var sourceType: Element | null = this.parent.lookup(sourceTypeName);
    return sourceType;
  }

  /**
   * Find the source type name,
   * eg: declare type account_name = u64;
   *     declare type account_name_alias = account_name;
   *     findSourceAsTypeName("account_name_alias") return "account_name";
   */
  private findSourceAsTypeName(typeName: string): string {
    var element = this.parent.lookup(typeName);
    if (element && element.kind == ElementKind.TYPEDEFINITION) {
      let typeDefine = <TypeDefinition>element;
      let aliasTypeName = typeDefine.typeNode.range.toString();
      return this.findSourceAsTypeName(aliasTypeName);
    }
    return typeName;
  }

  findSourceAbiType(typeName: string): string {
    var abiType: string | null = AbiHelper.abiTypeLookup.get(typeName) || null;
    if (abiType) {
      return abiType;
    }
    var element = this.parent.lookup(typeName);
    if (element && element.kind == ElementKind.TYPEDEFINITION) {
      let typeDefine = <TypeDefinition>element;
      let aliasTypeName = typeDefine.typeNode.range.toString();
      return this.findSourceAbiType(aliasTypeName);
    }
    return typeName;
  }
}
