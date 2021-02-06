const Handlebars = require("handlebars");
const fs = require("fs");
var blake2 = require('blake2');
/**
 * Register the tag of each.
 */
Handlebars.registerHelper("each", function (context, options) {
  var ret = "";
  for (var i = 0, j = context.length; i < j; i++) {
    let data = context[i];
    data._index = i;
    data.isMid = (i != j - 1 || (i == 0 && j == 1));
    ret = ret + options.fn(data);
  }
  return ret;
});
/**
 * Register the tag of selector.
 */
Handlebars.registerHelper("selector", function (context, options) {
  let keyHash = blake2.createHash('blake2b', { digestLength: 32 });
  keyHash.update(Buffer.from(context));
  let hexStr = keyHash.digest("hex");
  return `0x${hexStr.substr(0,8)}`;
});

/**
 * Register the tag of selector.
 */
Handlebars.registerHelper("keySelector", function (context, options) {
  let keyHash = blake2.createHash('blake2b', { digestLength: 32 });
  keyHash.update(Buffer.from(context));
  let hexStr = keyHash.digest("hex");
  return `0x${hexStr}`;
});

/**
 * Register the tag of selector.
 */
Handlebars.registerHelper("selectorArr", function (context, options) {
  let keyHash = blake2.createHash('blake2b', { digestLength: 32 });
  keyHash.update(Buffer.from(context));
  let hexStr = keyHash.digest("hex");
  let selectorArr = [];
  for (let index = 0; index < 4; index ++) {
    selectorArr.push("0x" + hexStr.substring(index * 2, index * 2 + 2));
  }
  return `[${selectorArr.join(",")}]`;
});

/**
 * Register the tag of join.
 */
Handlebars.registerHelper("joinParams", function (context, options) {
  var data = [];
  for (var i = 0, j = context.length; i < j; i++) {
    data.push("p" + i);
  }
  return data.join(",");
});

/**
 * Register the tag of equal
 */
Handlebars.registerHelper("equal", function (v1, v2, options) {
  if (v1 == v2) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

function removeSourceCode(sourceText, range, store) {
  let prefix = sourceText.substring(0, range.start);
  let suffix = sourceText.substring(range.end, sourceText.length);
  return prefix + store + suffix;
}

// Write text (also fallback)
function outputCode(sourceText, abiInfo) {
  let mainTpl = fs.readFileSync(__dirname + "/tpl/main.tpl", { encoding: "utf8" });
  const render = Handlebars.compile(mainTpl);
  const exportMain = render(abiInfo);
  let storeTpl = fs.readFileSync(__dirname + "/tpl/store.tpl", { encoding: "utf8" });
  
  for (let index = 0; index < abiInfo.storages.length; index ++) {
    let store = Handlebars.compile(storeTpl)(abiInfo);
    sourceText = removeSourceCode(sourceText, abiInfo.storages[index].range, store);
  }
  // let pro = sourceText  + exportMain;
  // console.log("program", pro);
  return sourceText + exportMain;
}

function outputAbi(abiInfo) {
  let abiTpl = fs.readFileSync(__dirname + "/tpl/abi.tpl", { encoding: "utf8" });
  const render = Handlebars.compile(abiTpl);
  const output = render(abiInfo);
  return output;
}

exports.outputCode = outputCode;

exports.outputAbi = outputAbi;