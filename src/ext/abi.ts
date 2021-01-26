import {
  SerializeInserter,
  InsertPoint
} from "./inserter";

import {
  MethodDef
} from "./contract/base";

import {
  Type,
  TypeKind,
} from "../types";

import {
  ElementKind,
  Element,
  ClassPrototype,
  FunctionPrototype,
  Program,
  VariableLikeElement,
} from "../program";

import {
  DecoratorKind,
  FunctionDeclaration,
  DeclarationStatement,
  FieldDeclaration,
  NodeKind,
  ParameterNode,
  Expression,
  VariableLikeDeclarationStatement,
  StringLiteralExpression,
  TypeNode,
  DecoratorNode,
  Node,
  ClassDeclaration,
  NamedTypeNode
} from "../ast";

import {
  AstUtil,
  TypeNodeAnalyzer,
  TypeNodeDesc
} from "./astutil";

import {
  Strings,
  AbiUtils
} from "./primitiveutil";

import {
  ContractInterperter, StorageGenerator
} from './annotation';

class StructDef {
  name: string = '';
  fields: Array<Object> = new Array<Object>();
  base: string = '';

  addField(name: string, type: string): void {
    this.fields.push({ "name": name, "type": type });
  }
}

export class ContractExportDef {
  className: string;
  contractName: string;
  deployers: MethodDef[] = new Array();
  messages: MethodDef[] = new Array();

  constructor(clzName: string) {
    this.className = clzName;
    this.contractName = Strings.lowerFirstCase(this.className);
  }
}
export class TypePair {
  key: string = "";
  ty: i32 = 0;
}

export class LayoutDef {
}

export class CellLayoutDef extends LayoutDef {
  cell: TypePair = new TypePair();
}

export class FieldDef {
  layout: LayoutDef = new LayoutDef();
  name: string = "";
  fieldType: string = "";
  fieldCodecType: string | undefined = "";
  storeKey: string = "";
  varName: string = "";
  path: string = "";
}

export class StorageDef {
  className: string = "";
  fields: FieldDef[] = new Array();
}

class AbiAliasDef {
  new_type_name: string;
  type: string;

  constructor(newTypeName: string, wasmType: string) {
    this.new_type_name = newTypeName;
    this.type = wasmType;
  }
}

/**
 * Contract abi action. This class represents one action structure.
 * The field "ability" represents whether action would change the db status.
 * It has two values, normal and pureview.
 * Pureview represents readable action which would not change the db.
 */
class ActionDef {
  name: string;
  type: string;
  ability: string;
  ricardian_contract: string = "";

  constructor(name: string, type: string, ability: string = "normal") {
    this.name = name;
    this.type = type;
    this.ability = ability;
  }

  static isValidAbility(ability: string): boolean {
    return ability == "normal" || ability == "pureview";
  }
}

export class AbiHelper {
  /**
   * Main node support internal abi type
   * bool
   */
  static abiTypeLookup: Map<string, string> = new Map([
    ["i8", "int8"],
    ["i16", "int16"],
    ["i32", "int32"],
    ["i64", "int64"],
    ["isize", "uin32"],
    ["u8", "uint8"],
    ["u16", "uint16"],
    ["u32", "uint32"],
    ["u64", "uint64"],
    ["usize", "usize"],
    ["f32", "float32"],
    ["f64", "float64"],
    ["bool", "bool"],
    ["boolean", "bool"],
    ["string", "string"],
    ["String", "string"],
  ]);
}

class TableDef {
  name: string;
  type: string;
  index_type: string = "i64";
  keys_names: string[] = ["currency"];
  keys_types: string[] = ["uint64"];

  constructor(name: string, type: string, indexType: string = "i64") {
    this.name = name;
    this.type = type;
    this.index_type = indexType;
  }
}

/**
 * Abi defination
 */
class AbiDef {
  version: string = "link";
  types: Array<AbiAliasDef> = new Array<AbiAliasDef>();
  structs: Array<StructDef> = new Array<StructDef>();
  actions: Array<ActionDef> = new Array<ActionDef>();
  tables: Array<TableDef> = new Array<TableDef>();
}
export class TypeDef {
  type: string = "";
  index: i32 = 0;
}

export class ContractInfo {

  abiInfo: AbiDef = new AbiDef();
  program: Program;
  abiTypeLookup: Map<string, string> = AbiHelper.abiTypeLookup;
  typeAliasSet: Set<string> = new Set<string>();
  structsLookup: Map<string, StructDef> = new Map();
  elementLookup: Map<string, Element> = new Map();
  insertPointsLookup: Map<string, Array<InsertPoint>> = new Map<string, Array<InsertPoint>>();
  exportDef: ContractExportDef = new ContractExportDef("");
  stores: StorageDef[] = new Array();
  typeMap: Map<string, TypeDef> = new Map<string, TypeDef>();
  types: TypeDef[] = new Array();
  typeIndex: i32 = 1;
  fields: FieldDef[] = new Array();

  constructor(program: Program) {
    this.program = program;
    this.resolve();
  }

  private addAbiTypeAlias(typeNodeAnalyzer: TypeNodeAnalyzer): void {
    var asTypes = typeNodeAnalyzer.getAsTypes();
    for (let asType of asTypes) {
      if (this.typeAliasSet.has(asType)) {
        continue;
      }
      // if the as argument is basic type, get his alias type
      let abiType = typeNodeAnalyzer.findSourceAbiType(asType);
      if (abiType && asType != abiType) {
        this.abiInfo.types.push(new AbiAliasDef(asType, abiType));
      }
      // If the as argument is class, convert it to struct
      let element = typeNodeAnalyzer.findElement(asType);
      if (element && element.kind == ElementKind.CLASS_PROTOTYPE) {
        let classPrototype = <ClassPrototype>element;
        this.getStructFromClzPrototype(classPrototype);
      }
      this.typeAliasSet.add(asType);
    }
  }

  resolveDatabaseDecorator(clsProto: ClassPrototype): void {
    var decorators = clsProto.decoratorNodes;
    if (!decorators) {
      return;
    }
    for (let decorator of decorators) {
      if (decorator.decoratorKind == DecoratorKind.DATABASE && decorator.args) {
        // Decorator argument must have two arguments
        if (decorator.args.length != 2) {
          throw new Error("Database decorator must have two arguments");
        }
        let type = decorator.args[0].range.toString();
        let name = this.getExprValue(clsProto, decorator.args[1]);
        AbiUtils.checkDatabaseName(name);
        this.abiInfo.tables.push(new TableDef(name, type));
        this.getStructFromNode(clsProto, decorator.args[0]);
      }
    }
  }

  /**
   * Get the expression value.
   * @param expr
   */
  getExprValue(protoEle: Element,expr: Expression): string {
    var arg: string = expr.range.toString();
    if (Strings.isAroundQuotation(arg)) {
      return arg.substring(1, arg.length - 1);
    }
    var element = protoEle.lookup(arg);
    var internalName = AstUtil.getInternalName(expr);
    if (!element) {
      element = this.program.elementsByName.get(internalName) || null;
    }
    if (element) {
      let declaration = <VariableLikeDeclarationStatement> (<VariableLikeElement>element).declaration;
      if (declaration.initializer) {
        let literal = <StringLiteralExpression>declaration.initializer;
        return literal.value;
      }
    }
    throw new Error(`Can't find constant ${internalName}`);
  }

  /**
  *  Get struct from expression.
  */
  private getStructFromNode(ele: Element, node: Node): void {
    var element = ele.lookup(node.range.toString());
    var classPrototype = <ClassPrototype>element;
    this.getStructFromClzPrototype(classPrototype);
  }

  /**
   * Add the field of the class to the structure
   * @param classPrototype The class prototype
   * @param struct The abi structure
   */
  private addFieldsFromClassPrototype(classPrototype: ClassPrototype, struct: StructDef): void {
    var members: DeclarationStatement[] = (<ClassDeclaration>classPrototype.declaration).members;
    if (classPrototype.basePrototype && AstUtil.impledSerializable(classPrototype.basePrototype)) {
      this.addFieldsFromClassPrototype(classPrototype.basePrototype, struct);
    }
    for (let member of members) {
      if (member.kind == NodeKind.FIELDDECLARATION) {
        let fieldDeclare: FieldDeclaration = <FieldDeclaration>member;
        let memberName = member.name.range.toString();
        let memberType: TypeNode | null = fieldDeclare.type;
        if (memberType && !AstUtil.haveSpecifyDecorator(fieldDeclare, DecoratorKind.DEPLOYER)) {
          let typeNodeAnalyzer: TypeNodeAnalyzer = new TypeNodeAnalyzer(classPrototype, <NamedTypeNode>memberType);
          let abiType = typeNodeAnalyzer.getAbiDeclareType();
          struct.addField(memberName, abiType);
          this.addAbiTypeAlias(typeNodeAnalyzer);
        }
      }
    }
  }

  private getStructFromClzPrototype(classPrototype: ClassPrototype): void {
    if (!this.abiTypeLookup.get(classPrototype.name)) {
      let struct = new StructDef();
      struct.name = classPrototype.name;
      this.addFieldsFromClassPrototype(classPrototype, struct);
      this.addToStruct(struct);
    }
  }

  /**
   * It need to check the struct having fields.
   * @param struct the struct to add
   */
  private addToStruct(struct: StructDef): void {
    if (!this.structsLookup.has(struct.name)) {
      this.abiInfo.structs.push(struct);
      this.structsLookup.set(struct.name, struct);
    }
  }

  /**
  *  Resolve ClassPrototype to dispatcher
  */
  private getActionAbility(funcPrototype: FunctionPrototype): string {
    var statement = funcPrototype.declaration;
    var decoratorNode: DecoratorNode | null = AstUtil.getSpecifyDecorator(statement, DecoratorKind.MESSAGE);
    if (!decoratorNode) {
      throw new Error(`The function don't have action decorator, location: ${AstUtil.location(statement.range)}.`);
    }
    var args: Expression[] | null = decoratorNode.args;
    if (args && args.length > 0) {
      let arg = this.getExprValue(funcPrototype, args[0]);
      if (!ActionDef.isValidAbility(arg)) {
        throw new Error(`Invalid action ability arguments: ${arg}, location: ${AstUtil.location(statement.range)}.`);
      }
      return arg;
    }
    return "normal";
  }

  /**
   * Resolve funciton prototype to abi
   */
  private resolveFunctionPrototype(funcProto: FunctionPrototype): void {

    var declaration: FunctionDeclaration = <FunctionDeclaration> funcProto.declaration;
    var funcName = declaration.name.range.toString();
    var signature = declaration.signature;

    var struct = new StructDef();
    struct.name = funcName;

    var parameters: ParameterNode[] = signature.parameters;
    for (let parameter of parameters) {
      let type: TypeNode = parameter.type;
      let typeInfo = new TypeNodeAnalyzer(funcProto,  <NamedTypeNode>type);
      let abiType = typeInfo.getAbiDeclareType();
      struct.addField(parameter.name.range.toString(), abiType);
      this.addAbiTypeAlias(typeInfo);
    }

    this.addToStruct(struct);
    this.abiInfo.actions.push(new ActionDef(funcName, funcName, this.getActionAbility(funcProto)));
  }


  private isContractClassPrototype(element: Element): boolean {
    if (element.kind == ElementKind.CLASS_PROTOTYPE) {
      let clzPrototype = <ClassPrototype>element;
      return clzPrototype.instanceMembers != null && 
      AstUtil.haveSpecifyDecorator(clzPrototype.declaration, DecoratorKind.CONTRACT);
    }
    return false;
  }

  private isStoreClassPrototype(element: Element): boolean {
    if (element.kind == ElementKind.CLASS_PROTOTYPE) {
      let clzPrototype = <ClassPrototype>element;
      return clzPrototype.instanceMembers != null &&
        AstUtil.haveSpecifyDecorator(clzPrototype.declaration, DecoratorKind.STORAGE);
    }
    return false;
  }

  private pickUpAbiTypes(exportMethod: MethodDef): void {
    exportMethod.paramters.forEach(item => {
      let originalType = item.originalType;
      if (!this.typeMap.has(originalType)) {
        let typeDef = new TypeDef();
        typeDef.index = this.typeIndex++;
        typeDef.type = originalType;
        this.typeMap.set(originalType, typeDef);
      }
      item.index = this.getIndexOfAbiTypes(originalType);
    });
  }

  private getIndexOfAbiTypes(originalType: string): i32 {
    let typeDef = this.typeMap.get(originalType);
    return typeDef == undefined ? 0 : typeDef.index;
  }

  private resolve(): void {
    var serializeInserter: SerializeInserter = new SerializeInserter(this.program);
    var serializePoints = serializeInserter.getInsertPoints();
    this.insertPointsLookup = InsertPoint.toSortedMap(serializePoints);

    for (let [key, element] of this.program.elementsByName) {
      // find class 
      if (!this.elementLookup.has(key) && this.isContractClassPrototype(element)) {
        let exportGenerator = new ContractInterperter(<ClassPrototype>element)
        this.exportDef = exportGenerator.getExportMethods();
      }
      if (!this.elementLookup.has(key) && this.isStoreClassPrototype(element)) {
        let storeGenerator: StorageGenerator = new StorageGenerator(<ClassPrototype>element);
        this.stores.push(storeGenerator.storageDef);
      }
    }


    for (let index = 0; index < this.exportDef.deployers.length; index++) {
      let exportDef: MethodDef = this.exportDef.deployers[index];
      this.pickUpAbiTypes(exportDef);
    }

    for (let index = 0; index < this.exportDef.messages.length; index++) {
      let exportDef: MethodDef = this.exportDef.messages[index];
      this.pickUpAbiTypes(exportDef);
    }

    for (let index = 0; index < this.stores.length; index++) {
      let storeDef: StorageDef = this.stores[index];
      storeDef.fields.forEach(item => {
        let originalType = item.fieldType
        if (!this.typeMap.has(originalType)) {
          let typeDef = new TypeDef();
          typeDef.index = this.typeIndex++;
          typeDef.type = originalType;
          this.typeMap.set(originalType, typeDef);
        }
        let typeDef = this.typeMap.get(originalType);
        let cellLayoutDef: CellLayoutDef = new CellLayoutDef();
        item.layout = cellLayoutDef;
        if (typeDef) {
          cellLayoutDef.cell.ty = typeDef.index;
          cellLayoutDef.cell.key = item.storeKey;
        }
      })
    }
    for (let [key, value] of this.typeMap) {
      this.types.push(value);
    }
    for (let index = 0; index < this.stores.length; index++) {
      this.stores[index].fields.forEach(element => {
        this.fields.push(element);
      });
    }
  }
}

export function getContractInfo(program: Program): ContractInfo {
  return new ContractInfo(program);
}
