import { TypeNodeDesc } from "../astutil"

export class MethodDef {
  methodName: string = "";
  paramters: TypeNodeDesc[] = new Array();
  hasReturnVal: boolean = false;
  returnType: TypeNodeDesc | undefined;
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
    let type: string | undefined = TypeUtil.typeWrapperMap.get(asType);
    return type == undefined ? "" : type;
  }
}