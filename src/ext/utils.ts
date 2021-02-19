import {
  DeclarationStatement,
  DecoratorKind,
  Node,
  ClassDeclaration,
  DecoratorNode,
  Expression,
  NodeKind,
  IdentifierExpression,
  BinaryExpression
} from "../ast";

import {
  Range
} from "../tokenizer";

import {
  ClassPrototype,
  Element,
  ElementKind,
  FieldPrototype,
  FunctionPrototype
} from "../program";

export class ElementUtil {

  static isEventClassPrototype(element: Element): boolean {
    if (element.kind == ElementKind.CLASS_PROTOTYPE) {
      let clzPrototype = <ClassPrototype>element;
      return AstUtil.hasSpecifyDecorator(clzPrototype.declaration, DecoratorKind.EVENT);
    }
    return false;
  }

  static isContractClassPrototype(element: Element): boolean {
    if (element.kind == ElementKind.CLASS_PROTOTYPE) {
      let clzPrototype = <ClassPrototype>element;
      return AstUtil.hasSpecifyDecorator(clzPrototype.declaration, DecoratorKind.CONTRACT);
    }
    return false;
  }

  static isStoreClassPrototype(element: Element): boolean {
    return  (element.kind == ElementKind.CLASS_PROTOTYPE) 
      ? AstUtil.hasSpecifyDecorator((<ClassPrototype>element).declaration, DecoratorKind.STORAGE)
      : false;
  }

  /**
   * Check the element whether is action function prototype.
   * @param element 
   */
  static isCntrFuncPrototype(element: Element): boolean {
    if (element.kind == ElementKind.FUNCTION_PROTOTYPE) {
      return AstUtil.hasSpecifyDecorator((<FunctionPrototype>element).declaration, DecoratorKind.CONSTRUCTOR);
    }
    return false;
  }

  static isTopicField(element: Element): boolean {
    if (element.kind == ElementKind.FIELD_PROTOTYPE) {
      return AstUtil.hasSpecifyDecorator((<FieldPrototype>element).declaration, DecoratorKind.CONSTRUCTOR);
    }
    return false;
  }


  /**
   * Check the element whether is action function prototype.
   * @param element 
   */
  static isMessageFuncPrototype(element: Element): boolean {
    if (element.kind == ElementKind.FUNCTION_PROTOTYPE) {
      let funcType = <FunctionPrototype>element;
      return AstUtil.hasSpecifyDecorator(funcType.declaration, DecoratorKind.MESSAGE);
    }
    return false;
  }


}
export class AstUtil {

  static getSpecifyDecorator(statement: DeclarationStatement, kind: DecoratorKind): DecoratorNode | null {
    if (statement.decorators) {
      for (let decorator of statement.decorators) {
        if (decorator.decoratorKind == kind) {
          return decorator;
        }
      }
    }
    return null;
  }

  /**
     * Check the statment weather have the specify the decorator
     * @param statement Ast declaration statement
     * @param kind The specify decorators
     */
  static hasSpecifyDecorator(statement: DeclarationStatement, kind: DecoratorKind): boolean {
    if (statement.decorators) {      
      for (let decorator of statement.decorators) {
        if (decorator.decoratorKind == kind) {
          return true;
        }
      }
    }
    return false;
  }

  static getIdentifier(expression: Expression): string {
    if (expression.kind == NodeKind.IDENTIFIER) {
      return (<IdentifierExpression>expression).text;
    } else if (expression.kind == NodeKind.BINARY) {
      return (<BinaryExpression>expression).left.range.toString();
    }
    return "";
  }

  static getBinaryExprRight(expression: Expression): string {
    if (expression.kind == NodeKind.BINARY) {
      return (<BinaryExpression>expression).right.range.toString();
    }
    return "";
  }

  static isString(typeName: string): boolean {
    return "string" == typeName || "String" == typeName;
  }

  /**
     * Get the node internal name
     * @param node The program node
     */
  static getInternalName(node: Node): string {
    var internalPath = node.range.source.internalPath;
    var name = node.range.toString();
    var internalName = `${internalPath}/${name}`;
    return internalName.replace(",", "_");
  }

  /**
     * Get the basic type name
     * If the type name is string[], so the basic type name is string
     * @param declareType
     */
  static getArrayTypeArgument(declareType: string): string {
    var bracketIndex = declareType.indexOf("[");
    if (bracketIndex != -1) {
      let index = declareType.indexOf(" ") == -1 ? bracketIndex : declareType.indexOf(" ");
      return declareType.substring(0, index);
    }
    bracketIndex = declareType.indexOf("<");
    if (bracketIndex != -1) {
      let endIndex = declareType.indexOf(">");
      return declareType.substring(bracketIndex + 1, endIndex);
    }
    return declareType;
  }

  /**
     * Test the declare type whether is array type or not.
     * @param declareType The declare type
     */
  static isArrayType(declareType: string): boolean {
    return declareType == "[]" || declareType == "Array";
  }

  /**
     * Whether the declare type is map
     * @param declareType the declare type
     */
  static isMapType(declareType: string): boolean {
    return declareType == "Map";
  }

  /**
     * Test the class whether to implement the Serializable interface or not.
     */
  static impledSerializable(classPrototype: ClassPrototype | null): boolean {
    if (!classPrototype) {
      return false;
    }
    const interfaceName = "Serializable";
    var havingInterface = AstUtil.impledInterface(<ClassDeclaration>classPrototype.declaration, interfaceName);
    return havingInterface || AstUtil.impledSerializable(classPrototype.basePrototype);
  }

  /**
     * Test the class whetherto implement the Returnable interface or not.
     * @param classDeclaration The class declaration
     */
  static impledReturnable(classDeclaration: ClassDeclaration): boolean {
    const interfaceName = "Returnable";
    return AstUtil.impledInterface(classDeclaration, interfaceName);
  }

  private static impledInterface(classDeclaration: ClassDeclaration, interfaceName: string): boolean {
    var implementsTypes = classDeclaration.implementsTypes;
    if (implementsTypes) {
      for (let _type of implementsTypes) {
        if (_type.name.range.toString() == interfaceName) {
          return true;
        }
      }
    }
    return false;
  }

  /**
     * Check the classPrototype whther have the contract class.
     */
  static extendedContract(classPrototype: ClassPrototype): boolean {
    const contractName = "Contract";
    var basePrototype: ClassPrototype | null = classPrototype.basePrototype;
    if (basePrototype && basePrototype.name == contractName) {
      return true;
    }
    return false;
  }

  static isClassPrototype(element: Element): boolean {
    return element.kind == ElementKind.CLASS_PROTOTYPE;
  }

  static isSpecifyElement(element: Element, kind: ElementKind): boolean {
    return element.kind == kind;
  }

  /**
     * Get interfaces that class prototype implements.
     * @param classPrototype classPrototype
     */
  static impledInterfaces(classPrototype: ClassPrototype): string[] {
    var tempClz: ClassPrototype | null = classPrototype;
    var interfaces: string[] = new Array<string>();
    while (tempClz != null) {
      let implTypes = (<ClassDeclaration>tempClz.declaration).implementsTypes;
      if (implTypes) {
        for (let type of implTypes) {
          interfaces.push(type.name.range.toString());
        }
      }
      tempClz = tempClz.basePrototype;
    }
    return interfaces;
  }

  static location(range: Range): string {
    // TODO
    return range.source.normalizedPath + ":"
      + range.start.toString(10) + ":"
      + range.end.toString(10);
  }
}