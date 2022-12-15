/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// 基于属性的原型创建arrayMethods对象，将原型的属性挂到arrayMethods__proto__上去
export const arrayMethods = Object.create(arrayProto)
// 定义将要重写的方法
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
// 重写数组方法
methodsToPatch.forEach(function (method) {
  // cache original method
  // 缓存原数组方法
  const original = arrayProto[method]
  // 给新的原型方法定义类型, 将所有传入的参数赋值给args, 这里是ES6的函数rest特性
  def(arrayMethods, method, function mutator (...args) {
    // 首先直接调用数组的方法
    const result = original.apply(this, args)
    // 接下来的行为是为了触发数组的响应式
    // 取到自身的监测属性,用于触发后续的notify
    const ob = this.__ob__
    // 定义变量,用于保存数组新增选项
    let inserted
    switch (method) {
      // 如果是push或者unshift方法,则inserted属性就是传入的参数
      case 'push':
      case 'unshift':
        inserted = args
        break
      // 如果是splice方法,新增属性可能是传入参数的第3项
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 通知订阅更新
    ob.dep.notify()
    // 返回正常数据返回
    return result
  })
})
