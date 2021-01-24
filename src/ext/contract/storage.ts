export class StructDef {

}

export class TypePair {
  key: string = "";
  ty: i32 = 0;
}

export class StorageDef {
  className: string = "";
  fields: FieldDef[] = new Array();
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