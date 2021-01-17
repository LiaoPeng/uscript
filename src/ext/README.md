# Generate the abi and target as Code

## Supported AssemblyScript type

# Supported types
The following table shows the status of the types and their arrays:

|       Type        |       Support      | Array Support | 
|----------------------|:--------------------:|:------:|
| `Fixed width number` | ✅ | ✅ |
| `Compact Int`        | ✅ |✅ |
| `Big Integer` | :small_orange_diamond: *Limited Support* | :small_orange_diamond: *Limited Support* |
| `Byte` |✅ |✅ | 
| `Bool` | ✅| ✅|
| `Hash` |✅ | :heavy_minus_sign: |
| `String` | ✅|✅ | 
| `Map` |✅| :heavy_minus_sign: | 

The following table shows the status of the fixed width numbers:

| Тype | `8` | `16` | `32` | `64` | `128` | `256` | 
|--|:--:|:--:|:--:|:--:|:--:|:--:|
| `int` | ✅ | ✅| ✅|✅ | :heavy_minus_sign:|  :heavy_minus_sign:|
| `uint` | ✅ | ✅| ✅|✅ |✅ |:heavy_minus_sign:|


Reference the `as-scale-codec` lib. The git repo: https://github.com/LimeChain/as-scale-codec.git


## Supported annnotation for the contract

* Contract
  * On the class, specify the contrct of the class.
  * Generate the deploy and call method.
  * Deploy and call method structue
  ```
1. The class name
2. The constructor parameter list, the paramter name and type and the codec type
3. Return type
4. Contructor with parameter and without parameter, the way to generate selector
  ```

* Message
  * On the method, indicating the method is an action method.
  * Corresponding the abi, the abi element:
  ```
  1. Method name
  2. Parameter list, the paramter the name and the type and the related abi foundataion type.

  ```

  * 

* Storage
  * On the class, indicating the class is storage object. 



## The abi structure