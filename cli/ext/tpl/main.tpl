function isSelectorEqual(l: u8[], r: u8[]): boolean {
  if (l.length != r.length) return false;
  for (let i = 0; i < l.length; i++) {
    if (l[i] != r[i]) return false;
  }
  return true;
}`


export function deploy(): i32 {
  // const selector = arryToHexString(fnSelector);
  // Log.println("deploy.fnSelctor: " + selector);

  const {{ctorWithParams}}: u8[] = {{ctorWithParamsVal}}; // 
  const {{ctorWithoutParams}}: u8[] = {{ctorWithoutParamsVal}}
}