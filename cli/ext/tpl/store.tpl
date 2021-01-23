{{#each stores}}
class {{className}} {
  {{#each fields}}
  private {{varName}}: {{fieldType}} = null;
  {{/each}}

  {{#each fields}}
  get {{fieldName}}(): {{fieldType}} {
    if (this.{{varName}} === null) {
      const st = new Storage<{{fieldCodecType}}>("{{key}}");
      this.{{varName}} = st.load();
    }
    return this.{{varName}}!.unwrap();
  }

  set {{fieldName}}(v: {{fieldType}}) {
    this.{{varName}} = new {{fieldCodecType}}(v);
    const st = new Storage<{{fieldCodecType}}>("{{key}}");
    st.store(this.{{varName}});
  }
  {{/each}}
}
{{/each}}
