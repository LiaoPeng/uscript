/**
 * Generate the deploy and call method
 */

let funcSelectorEqual = `function isSelectorEqual(l: u8[], r: u8[]): boolean {
  if (l.length != r.length) return false;
  for (let i = 0; i < l.length; i++) {
    if (l[i] != r[i]) return false;
  }
  return true;
}`;


let deployBegin = "export function deploy(): i32 {";

let deployBody = [];
deployBody.push("  const reader = MessageInputReader.readInput();")
deployBody.push("  const fnSelector = reader.fnSelector;");
deployBody.push("")
let deployEnd = "}"


function generateDeploy(deployStruct) {

}