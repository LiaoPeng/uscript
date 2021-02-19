class {{className}} extends Event {
  {{#each fields}}
  private {{varName}}: {{type.codecType}};
  {{/each}}
  
  prepare(): void {
    {{#each fields}}
    {{#if decorators.isTopic}}
    Event.appendTopic(this.{{varName}});
    {{/if}}
    {{/each}}

    {{#each fields}}
    Event.appendData(this.{{varName}});
    {{/each}}
  }
 
}