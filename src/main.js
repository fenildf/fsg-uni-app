import Vue from 'vue'
import App from './App'

import store from './store'

Vue.config.productionTip = false

Vue.prototype.$store = store;


// 环境变量
Vue.prototype.baseUrl = null;
if(process.env.NODE_ENV=='development'){
	Vue.prototype.baseUrl = 'http://192.168.20.51:3000';
}else if(process.env.NODE_ENV=='test'){

}else if(process.env.NODE_ENV=='production'){

}

App.mpType = 'app'

const app = new Vue({
	store,
	...App
})
app.$mount()
