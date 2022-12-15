/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
// 创建订阅
export default class Dep {
  // 在类上定义一个静态属性
  static target: ?Watcher;
  id: number;
  // 依赖收集的watcher列表
  subs: Array<Watcher>;

  constructor () {
    // 初始化id和subs
    this.id = uid++
    this.subs = []
  }

  // 添加到订阅
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 移除订阅
  removeSub (sub: Watcher) {
    // 将watcher从subs中移除
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 通知watcher列表更新
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      // 如果subs不是同步执行的话，就不是按顺序的，现在进行排序然后按照正确的顺序通知watcher更新
      subs.sort((a, b) => a.id - b.id)
    }
    // 遍历wather进行更新
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 计算watcher的时候，将watcher挂载到Dep类上，
// watcher和dep是多对多的关系,需要让其互相记住
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
