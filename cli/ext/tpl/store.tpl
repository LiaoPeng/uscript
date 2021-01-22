{{#each stores}}
class {{className}} {
  {{#each fields}}
  private {{varName}}: {{fieldType}} = null;
  {{/each}}

  {{#each fields}}
  get {{fieldName}}(): {{fieldType}} {
    if (this.{{varName}} === null) {
      const st = new Storage<{{codecType}}>("{{key}}");
      this.{{varName}} = st.load();
    }
    return this.{{varName}}!.unwrap();
  }

  set {{fieldName}}(v: bool) {
    this.{{varName}} = new {{codecType}}(v);
    const st = new Storage<{{codecType}}>("{{key}}");
    st.store(this.{{v}});
  }
  {{/each}}
}
{{/each}}
