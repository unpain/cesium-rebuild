import api from "@/api/request"

export const addBuild = (data)=>{
  return api({
    url:'/addScheme',
    method:'POST',
    params:data
  })
}

export const getBuild = ()=>{
  return api({
    url:'/getScheme',
    method:'GET'
  })
}

export const  delBuild = (id)=>{
    return api({
      url:'/delScheme',
      method:'POST',
      params:{
        id,
      }
    })
}
