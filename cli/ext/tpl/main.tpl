var msg: Msg = new Msg();

export function deploy(): i32 {
  // const selector = arryToHexString(fnSelector);
  // Log.println("deploy.fnSelctor: " + selector);

  const ctorWithParams: u8[] = {{ctorWithParamsVal}}; // 
  const ctorWithoutParams: u8[] = {{ctorWithoutParamsVal}}

  let _{{exportDef.className}} = new {{exportDef.className}}();

  {{#each exportDef.deployers}}
  if (msg.isSelector(ctorWithParams)) {
    _{{../exportDef.className}}.{{methodName}}(false);
  }
  {{/each}}
}

export function call(): i32 {
  const _{{exportDef.contractName}} = new {{exportDef.className}}();
  {{#each exportDef.messages}}
  const {{methodName}}Selector: u8[] = {{#selectorArr methodName}}{{/selectorArr}};
  if (msg.isSelector({{methodName}}Selector)) {
    const fnParameters = new FnParameters(msg.data);
    {{#each paramters}}
    let p{{_index}} = fnParameters.get<{{codecType}}>();
    {{/each}}
    {{#if hasReturnVal}}
    let rs = _{{../exportDef.contractName}}.{{methodName}}({{#joinParams paramters}}{{/joinParams}});
    ReturnData.set<{{returnType.codecType}}>(new {{returnType.codecType}}(rs));
    {{/if}}
    {{#unless hasReturnVal}}
    _{{../exportDef.contractName}}.{{methodName}}({{#joinParams paramters}}{{/joinParams}});
    {{/unless}}
  }
  {{/each}}

}