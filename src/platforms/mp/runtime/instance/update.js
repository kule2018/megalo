import { isDef } from 'core/util/index'
import { getVMId, getHid } from './helper'
import {
  throttle,
  getValue,
  deepEqual,
  Buffer,
  VM_ID_SEP,
  VM_ID_VAR,
  VM_ID_PREFIX,
  // LIST_TAIL_SEPS,
  ROOT_DATA_VAR,
  SLOT_HOLDER_VAR,
  HOLDER_VAR,
  // SLOT_CONTEXT_ID_VAR,
  HOLDER_TYPE_VARS
} from 'mp/util/index'

function isEmptyObj (obj = {}) {
  return Object.keys(obj).length === 0
}

export function initVMToMP (vm) {
  // const sep = LIST_TAIL_SEPS[vm.$mp.platform] || LIST_TAIL_SEPS.wechat

  vm = vm || this
  const vmId = getVMId(vm)
  const { $vnode = '' } = vm
  const info = {
    cid: vmId,
    cpath: `${vmId}${VM_ID_SEP}`
  }

  const prefix = `${ROOT_DATA_VAR}.${vmId}`

  vm.$mp._update({
    [`${prefix}.n`]: $vnode.tag || '$root',
    [`${prefix}.${VM_ID_VAR}`]: info.cid,
    [`${prefix}.${VM_ID_PREFIX}`]: info.cpath
  })
}

export function updateMPData (type = HOLDER_TYPE_VARS.text, data, vnode) {
  const vm = this
  const vmId = getVMId(vm)
  const hid = getHid(vm, vnode)
  const dataPaths = [
    ROOT_DATA_VAR,
    vmId,
    vnode.slotContext ? SLOT_HOLDER_VAR : HOLDER_VAR,
    hid,
    type
  ]
  let dataPathStr = dataPaths.join('.')

  const curValue = getValue(vm.$mp.page.data, dataPaths)
  const isDeepEqual = deepEqual(curValue, data)

  /* istanbul ignore else */
  if (isDef(hid)) {
    if (vm.$mp.platform === 'swan' && /[^A-Za-z0-9_]/.test(type)) {
      dataPathStr = dataPathStr.replace(/\.[^\.]*$/, `['${type}']`)
    }

    if (!isDeepEqual || !vm.$mp._isEqualToBuffer(dataPathStr, data)) {
      vm.$mp._update({
        [dataPathStr]: data
      })
    }
  }
}

export function createUpdateFn (page) {
  const buffer = new Buffer()

  function doUpdate () {
    const data = buffer.pop()

    if (!isEmptyObj(data) && page.setData) {
      page.setData(data)
    }
  }

  const throttleSetData = throttle(function () {
    doUpdate()
  }, 50, { leadingDelay: 0 })

  return {
    update (data) {
      buffer.push(data)
      throttleSetData()
    },
    instantUpdate (data) {
      doUpdate()
    },
    isEqualToBuffer (key, value) {
      return buffer.isEqual(key, value)
    }
  }
}

export function updateVnodeToMP (vnode, key = HOLDER_TYPE_VARS.text, value) {
  const { context, slotContext } = vnode
  const realContext = slotContext || context
  realContext && realContext.$updateMPData(key, value, vnode)

  /* istanbul ignore if */
  if (!realContext) {
    console.warn('update text with no context', key, value, vnode)
  }
}

