(module
 (type $i (func (result i32)))
 (memory $0 1)
 (export "default" (func $named-export-default/get3))
 (export "memory" (memory $0))
 (func $named-export-default/get3 (; 0 ;) (type $i) (result i32)
  (i32.const 3)
 )
)
