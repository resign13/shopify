import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

test('catalog group renders style/color stock, clips shortages and removes only repeated summary titles', async () => {
  const server = await createServer({configFile:false,plugins:[vue()],optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,ws:false}})
  try {
    const {default:Group} = await server.ssrLoadModule('/src/storefront/components/StyleCatalogGroup.vue')
    const router = createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{render:()=>null}},{path:'/product/:slug',component:{render:()=>null}}]})
    await router.push('/')
    const group = {name:'Cotton Shirt',summary:'Cotton Shirt',styleCode:'CS5101',priceRange:{min:10,max:12},sizeCodes:['28/S','Tall XL'],variants:[
      {id:1,slug:'black',colorName:'Black',sku:'CS5101-Black',stock:-10,sizePrices:[{stock:7},{stock:-17}]},
      {id:2,slug:'white',colorName:'White',sku:'CS5101-White',stock:-5},
    ]}
    const render = () => renderToString(createSSRApp(Group,{group}).use(router))
    let html = await render()
    assert.match(html,/Total stock: 7 pcs/)
    assert.match(html,/Stock: 7 pcs/)
    assert.match(html,/Stock: 0 pcs/)
    assert.doesNotMatch(html,/-10 pcs|-5 pcs|-17 pcs/)
    assert.equal((html.match(/Cotton Shirt/g)||[]).length,1)
    assert.match(html,/Size: 28\/S \/ Tall XL/)
    assert.match(html,/href="\/product\/white"/)
    group.summary='150GSM 100% Cotton'
    html=await render()
    assert.match(html,/150GSM 100% Cotton/)
    group.variants[0].sizePrices=[{stock:-20}]
    assert.match(await render(),/Total stock: 0 pcs/)
  } finally { await server.close() }
})
