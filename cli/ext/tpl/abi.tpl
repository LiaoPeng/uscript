{
  "metadataVersion": "0.1.0",
  "source": {
    "hash": "{{hash}}",
    "language": "ink! 3.0.0-rc2",
    "compiler": "rustc 1.49.0-nightly"
  },
  "contract": {
    "name": "{{exportDef.className}}",
    "version": "0.1.0",
    "authors": [
      "[your_name] <[your_email]>"
    ]
  },
  "spec": {
    "constructors": [
      {{#each exportDef.deployers}}
      {
        "args": [
          {{#each paramters}}
          {
            "name": "{{typeName}}",
            "type": {
              "displayName": [
                "{{originalType}}"
              ],
              "type": {{index}}
            }
          }{{#if isMid}},{{/if}}
          {{/each}}
        ],
        "docs": [
          " Constructor that initializes the `bool` value to the given `init_value`."
        ],
        "name": [
          "{{methodName}}"
        ],
        "selector": "0xd183512b"
      }{{#if isMid}},{{/if}}
      {{/each}}
    ],
    "docs": [],
    "events": [],
    "messages": [
      {{#each exportDef.messages}}
      {
        "args": [
          {{#each paramters}}
          {
            "name": "{{typeName}}",
            "type": {
              "displayName": [
                "{{originalType}}"
              ],
              "type": {{index}}
            }
          }{{#if isMid}},{{/if}}
          {{/each}}
        ],
        "docs": [],
        "mutates": false,
        "name": [
          "{{methodName}}"
        ],
        "payable": false,
        "returnType": {
          {{#if hasReturnVal}}
          "displayName": [
            "{{returnType.originalType}}"
          ],
          "type": 1
          {{/if}}
        },
        "selector": "0x1e5ca456"
      }{{#if isMid}},{{/if}}
      {{/each}}
    ]
  },
  "storage": {
    "struct": {
      "fields": [
        {
          "layout": {
            "cell": {
              "key": "0x0000000000000000000000000000000000000000000000000000000000000000",
              "ty": 1
            }
          },
          "name": "value"
        }
      ]
    }
  },
  "types": [
    {
      "def": {
        "primitive": "{{originalType}}"
      }
    }
  ]
}