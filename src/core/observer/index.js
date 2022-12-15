/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

// 获取处理过后的原型,只获取自身属性,否则会把原型上的也拿到
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  // 递归遍历
  constructor (value: any) {
    this.value = value
    // 收集依赖，给每个属性收集依赖，用于对对象的依赖收集
    this.dep = new Dep()
    // 待确认是用来干嘛的
    this.vmCount = 0
    // 给value定义一个__ob__属性，该属性可枚举、配置、可以写，上面啥都有，value、dep、vmCount都挂在上面了
    def(value, '__ob__', this)
    // value是数组要走数组遍历
    if (Array.isArray(value)) {
      // 是否可以使用__proto__属性，因为这不是官方的规范，浏览器表现可能不一致
      // 重新数组属性的一些方法
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // observe数组
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  // 开始定义对象的响应式
  walk (obj: Object) {
    const keys = Object.keys(obj)
    // 遍历对象属性
    for (let i = 0; i < keys.length; i++) {
      // 给对象的每一个key值创建响应式
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  // 循环遍历数组进行数组中对象的响应式实现
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  // 覆盖掉数组原生的__proto__属性
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
// 没有__proto__的情况下，直接把重写的数组方法挂载到数组上去
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  // 遍历属性的情况
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
// ToRead asRootData是干嘛用的目前不知道，待确认
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果不是对象,或者对象是虚拟node,直接返回,
  // 初始化initState中传进来的_data肯定是对象，这里会直接走下去
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果value值有'__ob__'属性， 并且__ob__是Observer对象的实例，则代表是被observe过的，直接把value.__ob__赋值给ob返回
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  // 这一步是asRootData情况计数，待确认这个变量的意义
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 定义响应式
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 用于对具体属性的watcher收集
  const dep = new Dep()

  // 获取对象属性自身的属性信息
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 如果对象属性自身是不可配置的,直接返回
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 获取对象原本的get set
  const getter = property && property.get
  const setter = property && property.set
  // 如果没有getter 或者有setter，这里应该是 防止用户本意是只设置getter,让数据为只读属性,
  // 如果有set,或者既没有set也没有get的时候,就继续自定义set、get
  // 并且有两个参数（代表没有传入val值），则给val赋值值
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 如果是深度监听，则进行observe监听
  // 这个也是通过闭包保存一下
  let childOb = !shallow && observe(val)
  // 定义响应式数据
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    // 获取数据的行为
    get: function reactiveGetter () {
      // 如果原本有getter，则从getter中获取， 没有则使用val（val处于闭包中，不会进行销毁）
      const value = getter ? getter.call(obj) : val
      //ToRead待确认执行时机 如果Dep上有target，则触发依赖收集，首次进来不会触发, 待确认啥时候开始进行依赖收集
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      // 数据变更行为
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 如果新赋的值没有变更，||后面是为了判断不是NaN的场景，因为NaN和自身也不相等
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      // 如果环境不是生产环境,并且自定义setter,执行setter行为(目前不清楚是什么情况下用到)
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      // 如果有getter没setter,则直接返回, 这里待确认
      if (getter && !setter) return
      // 如果有setter则调用setter,否则直接复制给val,
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 新设置的值进行进行observe响应式化
      childOb = !shallow && observe(newVal)
      // 通知更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
// 给一个对象添加新属性,并触发变更
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 如果target是undefined或者是基本类型的话,给出警告
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 如果target是数组 并且key值是合法的索引
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 保证当前数组的长度为当前长度或者key的最大值
    target.length = Math.max(target.length, key)
    // 调用target的splice(这个方法是重写过的),会对这个添加进来的值进行observe,并且触发变更
    target.splice(key, 1, val)
    return val
  }
  // 如果key已经在target中了，并且不是Object原型上的值，也就是target自身的值
  if (key in target && !(key in Object.prototype)) {
    // 直接给target的值进行赋值，这里会触发set方法，如果是对象的话，会进行递归observe的，并触发更新操作
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  // 不能在运行时给Vue实例或者根节点的$data上设置响应式属性，应该提前在data选项上设置
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 如果target上边没有__ob__,说明target不是observe对象，直接赋值上去不管他了
  if (!ob) {
    target[key] = val
    return val
  }
  // 在对象上定义响应式
  defineReactive(ob.value, key, val)
  // 通知变更， 这里有疑惑，当前属性是添加进来的新属性，为啥要通知变更呢？
  // 可能是之前订阅了没有的属性，这个也加入了dep中？
  console.log(ob.dep)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
