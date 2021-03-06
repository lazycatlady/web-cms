import request from '@/utils/request'
let services = {}
// 获取用户列表
services.getUserList = function(params) {
  return request({
    url: '/user',
    method: 'get',
    params: params
  })
}
// 删除用户
services.deleteUser = function(token) {
  return request({
    url: '/user/info',
    method: 'get',
    params: { token }
  })
}
// 添加用户
services.addUser = function(token) {
  return request({
    url: '/user/logout',
    method: 'post',
    params: { token }
  })
}

export default services