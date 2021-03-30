<template>

  <view class="content login-page">
    <view>
      <view class="login-type">
        <view v-for="(item,index) in loginTypeList" :key="index" @click="loginType = index" :class="{act: loginType === index}"
              class="login-type-btn">{{item}}
        </view>
      </view>
      <view class="input-group" v-if="loginType === 0">
        <view class="input-row border">
          <text class="title">手机：</text>
          <m-input class="m-input" type="text" clearable focus v-model="mobile" placeholder="请输入手机号码"></m-input>
        </view>
        <view class="input-row">
          <text class="title">验证码：</text>
          <m-input type="text" v-model="code" placeholder="请输入验证码"></m-input>
          <view class="send-code-btn" @click="sendSmsCode">{{codeDuration ? codeDuration + 's' : '发送验证码' }}</view>
        </view>
      </view>
      <view class="input-group" v-else>
        <view class="input-row border">
          <text class="title">账号：</text>
          <m-input class="m-input" type="text" clearable focus v-model="username" placeholder="请输入账号"></m-input>
        </view>
        <view class="input-row border">
          <text class="title">密码：</text>
          <m-input type="password" displayable v-model="password" placeholder="请输入密码"></m-input>
        </view>
        <view v-if="needCaptcha" class="input-row">
          <text class="title">验证码：</text>
          <m-input type="text" v-model="captchaText" placeholder="请输入验证码"></m-input>
          <view class="send-code-btn captcha-view" @click="captcha('refreshCaptcha')">
            <i v-if="captchaing" class="uni-icon_toast uni-loading"></i>
            <img v-if="!captchaing" :src="captchaBase64" width="100%" height="100%"></img>
          </view>
        </view>
      </view>
      <view class="btn-row">
        <button type="primary" class="primary" :loading="loginBtnLoading" @tap="bindLogin">登录</button>
      </view>
      <view class="action-row">
        <navigator url="../reg/reg">注册账号</navigator>
      </view>
    </view>
    <view>
      <view v-for="provider in providerList" :key="provider.value">
        <view>
          <view class="oauth-image">
            <image :src="provider.image" @tap="toLogin(provider.value)"></image>
          </view>
        </view>
      </view>

      <view v-if="showAuth" class="base-alert">

      </view>
    </view>

  </view>

</template>

<script>
	import {
		mapState,
		mapMutations
	} from 'vuex'
	import mInput from '../../components/m-input.vue'
	import {
		univerifyLogin,
		univerifyErrorHandler
	} from '@/common/univerify.js'
	import {
		getDeviceUUID
	} from '@/common/utils.js'

	let weixinAuthService;
	const captchaOptions = {
		deviceId: getDeviceUUID(),
		scene: 'login'
	}

	export default {
		components: {
			mInput
		},
		data() {
			return {
        /*showAuth: false,*/
        platform: uni.getSystemInfoSync().platform,
				loginType: 1,
				loginTypeList: ['免密登录', '密码登录'],
				mobile: '',
				code: '',
				providerList: [],
				hasProvider: false,
				username: '',
				password: '',
				positionTop: 0,
				isDevtools: false,
				codeDuration: 0,
				loginBtnLoading: false,
				hasAppleLogin: false,
				needCaptcha: uni.getStorageSync('uni-needCaptcha'),
				captchaing: false,
				captchaBase64: '',
				captchaText: ''
			}
		},
		computed: mapState(['forcedLogin', 'hasLogin', 'univerifyErrorMsg', 'hideUniverify']),
		onLoad() {
		  let _this = this;
			// #ifdef APP-PLUS
			plus.oauth.getServices((services) => {
				weixinAuthService = services.find((service) => {
					return service.id === 'weixin'
				})
				if (weixinAuthService) {
					this.hasWeixinAuth = true
				}
			});
			// #endif
			if (this.needCaptcha) {
				this.captcha('createCaptcha')
			}
		},

    onReady() {
      this.initPosition();
      this.initProvider();
      // #ifdef MP-WEIXIN
      this.isDevtools = uni.getSystemInfoSync().platform === 'devtools';
      // #endif
    },

		methods: {
			...mapMutations(['login']),

			initProvider() {
				const filters = ['weixin', 'qq', 'sinaweibo', 'univerify'];
				uni.getProvider({
					service: 'oauth',
					success: (res) => {
						if (res.provider && res.provider.length) {
							if (res.provider.indexOf('apple') !== -1) {
								this.hasAppleLogin = true;
							}
							for (let i = 0; i < res.provider.length; i++) {
								const curProvider = res.provider[i];
								if (~filters.indexOf(curProvider)) {
									this.providerList.push({
										value: curProvider,
										image: '../../static/img/' + curProvider + '.png'
									});
								}
							}
							this.hasProvider = true;
						}
					},
					fail: (err) => {
						console.error('获取服务供应商失败：' + JSON.stringify(err));
					}
				});
			},
      /**
       * 使用 absolute 定位，并且设置 bottom 值进行定位。软键盘弹出时，底部会因为窗口变化而被顶上来。
       * 反向使用 top 进行定位，可以避免此问题。
       */
			initPosition() {
				this.positionTop = uni.getSystemInfoSync().windowHeight - 100;
			},
			sendSmsCode() {
				if (this.codeDuration) {
					uni.showModal({
						content: `请在${this.codeDuration}秒后重试`,
						showCancel: false
					})
				}
				if (!/^1\d{10}$/.test(this.mobile)) {
					uni.showModal({
						content: '手机号码填写错误',
						showCancel: false
					})
					return
				}
				uniCloud.callFunction({
					name: 'user-center',
					data: {
						action: 'sendSmsCode',
						params: {
							mobile: this.mobile,
							type: 'login'
						}
					},
					success: (e) => {
						if (e.result.code == 0) {
							uni.showModal({
								content: '验证码发送成功，请注意查收',
								showCancel: false
							})
							this.codeDuration = 60
							this.codeInterVal = setInterval(() => {
								this.codeDuration--
								if (this.codeDuration === 0) {
									if (this.codeInterVal) {
										clearInterval(this.codeInterVal)
										this.codeInterVal = null
									}
								}
							}, 1000)
						} else {
							uni.showModal({
								content: '验证码发送失败：' + e.result.msg,
								showCancel: false
							})
						}
					},
					fail(e) {
						uni.showModal({
							content: '验证码发送失败',
							showCancel: false
						})
					}
				})
			},
      /**
       * 客户端对账号信息进行一些必要的校验。
       * 实际开发中，根据业务需要进行处理，这里仅做示例。
       */
			async loginByPwd() {
				const data = {
          uid: this.username,
          name: this.password
				};
				this.userLogin(data,true);
			},
      userLogin(data,isJm){
        let _this = this;
        if(isJm){
          this.loginBtnLoading = true;
        }
        wx.request({
          data: data,
          method: "GET",
          header: {'content-type': 'application/json'},
          url: this.baseUrl + '/users/login',
          success: function(res) {
            if(isJm) {
              _this.loginBtnLoading = false;
            }
            res.data.isLogin && _this.toMain(_this.username);
          }
        });
      },
			loginBySms() {
				if (!/^1\d{10}$/.test(this.mobile)) {
					uni.showModal({
						content: '手机号码填写错误',
						showCancel: false
					})
					return
				}
				if (!/^\d{6}$/.test(this.code)) {
					uni.showModal({
						title: '验证码为6位纯数字',
						showCancel: false
					});
					return;
				}
			},
			bindLogin() {
				switch (this.loginType) {
					case 0:
						this.loginBySms()
						break;
					case 1:
						this.loginByPwd()
						break;
					default:
						break;
				}
			},
			oauth(value) {
				return new Promise((resolve, reject) => {
					// #ifdef APP-PLUS
					weixinAuthService.authorize(function(res) {
						resolve(res.code)
					}, function(err) {
						console.error(err)
						reject(new Error('微信登录失败'))
					});
					// #endif
					// #ifdef MP-WEIXIN
					uni.login({
						provider: 'weixin',
						success(res) {
							resolve(res.code)
						},
						fail(err) {
							console.error('授权登录失败：' + JSON.stringify(err));
							reject(new Error('微信登录失败'))
						}
					})
					// #endif
				})
			},
			loginLocal(nickName) {
				uni.setStorageSync('login_type', 'local')
				uni.setStorageSync('username', nickName)
				this.toMain(nickName);
			},
      /**
       * 强制登录时使用reLaunch方式跳转过来
       * 返回首页也使用reLaunch方式
       */
			toMain(userName) {
				this.login(userName);
				uni.reLaunch({
					url: '../main/main',
				});
			},
      registerNew(data){
        let _this = this;
        wx.request({
          data: data,
          method: "GET",
          header: {'content-type': 'application/json'},
          url: this.baseUrl + '/users/reg',
          success: function(res) {
            _this.userLogin(data,false);
          }
        });
      },
      /**
       * 判断是否授权
       * 已授权之后，自动获取用户信息
       */
      isAuthOrNot(callback){
        let _this = this;
        wx.getSetting({
          success: (res) => {
            if (res.authSetting["scope.userInfo"]) {
              console.log("已授权");
              _this.oauth('weixin').then((code) => {
                _this.beginAuth(code);
              });
            }
            else{
              console.log("未授权");
              callback()
            }
          }
        })
      },

      beginAuth(code){
        let _this = this;
        uni.getUserInfo({
          provider: 'weixin',
          success: (infoRes) => {
            //获取appid 入库
            wx.request({
              method: "GET",
              header: {'content-type': 'application/json'},
              url: 'https://api.weixin.qq.com/sns/jscode2session?appid=wx919189ebcb958151&secret=cb08ac3102f1aaf981e823f4f5f5cfc5&js_code=' + code + '&grant_type=authorization_code',
              success: function (res1) {
                _this.registerNew({
                  uid: res1.data.openid,
                  name: infoRes.userInfo.nickName
                });
                _this.username =  infoRes.userInfo.nickName;
              }
            });
          },
          fail() {
            uni.showToast({
              icon: 'none',
              title: '登陆失败'
            });
          }
        });
      },
      /**
       * 实际开发中，获取用户信息后，需要将信息上报至服务端。
       * 服务端可以用 userInfo.openId 作为用户的唯一标识新增或绑定用户信息。
       */
			toLogin(value) {
				if (value === 'apple') {
					this.loginByApple(value)
					return;
				}
				if (value === 'weixin') {
				  this.isAuthOrNot(()=>{
            uni.navigateTo({
              url: '../login/jump'
            });
          });
					return;
				}
				/*if (value === 'univerify') {
					univerifyLogin().catch(err => {
						if (typeof err === 'boolean') return;
						univerifyErrorHandler(err);
					})
					return;
				}
				uni.showModal({
					content: `${value}登录只演示登录api能力，暂未关联云端数据`,
					showCancel: false,
					complete: () => {
						console.log(`${value}登录只演示登录api能力，暂未关联云端数据`);
						uni.login({
							provider: value,
							success: (res) => {
								uni.getUserInfo({
									provider: value,
									success: (infoRes) => {
										this.loginLocal(infoRes.userInfo.nickName);
									},
									fail() {
										uni.showToast({
											icon: 'none',
											title: '登陆失败'
										});
									}
								});
							},
							fail: (err) => {
								console.error('授权登录失败：' + JSON.stringify(err));
							}
						});
					}
				})*/
			},
			async loginByApple(value) {
				if (!this.hasAppleLogin) {
					uni.showModal({
						showCancel: false,
						content: `暂无法使用苹果登录，Apple登录集成教程：\nhttps://ask.dcloud.net.cn/article/36651`
					})
					return
				};
				let Provider = value;
				const [loginErr, loginData] = await uni.login({
					provider: Provider
				});
				if (loginErr) {
					uni.showModal({
						showCancel: false,
						content: '苹果登录失败，请稍后再试'
					})
					return;
				}
				// 获取用户信息
				const [getUserInfoErr, result] = await uni.getUserInfo({
					provider: Provider
				});
				if (getUserInfoErr) {
					let content = getUserInfoErr.errMsg;
					if (~content.indexOf('uni.login')) {
						content = '请先完成登录操作';
					}
					uni.showModal({
						title: '获取用户信息失败',
						content: '错误原因' + content,
						showCancel: false
					});
					return;
				}
				// uni-id 苹果登录
				uniCloud.callFunction({
					name: 'user-center',
					data: {
						action: 'loginByApple',
						params: result.userInfo
					},
					success: (e) => {
						console.log('loginByApple success', e);
						if (!e.success) {
							uni.showModal({
								showCancel: false,
								content: JSON.stringify(e.message)
							})
							return;
						}
						const username = e.result.username || e.result.nickname;

						uni.setStorageSync('uni_id_token', e.result.token)
						uni.setStorageSync('login_type', 'online')

						this.toMain(username);
					},
					fail: (e) => {
						uni.showModal({
							content: `苹果登录失败: ${JSON.stringify(e)}`,
							showCancel: false
						})
					}
				})
			},
			async captcha(action, args) {
				if (this.captchaing) return;

				// 验证不loading
				this.captchaing = true;

				let {
					result: res
				} = await uniCloud.callFunction({
					name: 'user-center',
					data: {
						action,
						params: {
							...captchaOptions,
							...args
						}
					}
				})
				this.captchaing = false;
				if (res.code === 0) {
					this.captchaBase64 = res.captchaBase64
				} else {
					uni.showToast({
						icon: 'none',
						title: res.message,
						duration: 1000
					})
				}
				return res;
			},
			openAppleLoginDoc() {
				// #ifdef APP-PLUS
				plus.webview.open('https://ask.dcloud.net.cn/article/36651')
				// #endif
			}
		}
	}
</script>

<style lang="scss">
.login-page{

  /*自定义提示框公共样式*/
  .base-alert {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    flex-direction: row;
    transition: all .5s ease-in-out;
    font: 14px PingFang-SC;
    z-index: 1000;
    border-radius: 8px;
    .wrap {
      background-color: #FFFFFF;
      position: absolute;
      z-index: 1002;
      width: 92%;
      top: 50%;
      left: 50%;
      flex: 1;
      -webkit-transform: translateX(-50%) translateY(-50%);
      -webkit-transform: translateX(-50%) translateY(-50%);
      -moz-transform: translateX(-50%) translateY(-50%);
      -ms-transform: translateX(-50%) translateY(-50%);
      transform: translateX(-50%) translateY(-50%);
      .btn-base {
        position: absolute;
        right:-11px;
        top:-11px;
        height: 22px;
        width: 22px;
        text-align: center;
        z-index: 9999;
        border: 0;
        cursor: pointer;
      }
      .btn-close{
        background: url(../../static/img/close.png) no-repeat center ;
      }
      img{
        // width: auto!important;
        // height: auto!important;
        max-width: 900px;
        max-height: 600px;
      }
    }

  }

  .login-type {
    display: flex;
    justify-content: center;
  }

  .login-type-btn {
    line-height: 30px;
    margin: 0px 15px;
  }

  .login-type-btn.act {
    color: #0FAEFF;
    border-bottom: solid 1px #0FAEFF;
  }

  .send-code-btn {
    width: 120px;
    text-align: center;
    background-color: #0FAEFF;
    color: #FFFFFF;
  }

  .action-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .action-row navigator {
    color: #007aff;
    padding: 0 10px;
  }

  .oauth-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    flex-wrap: wrap;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }

  .oauth-image {
    margin: 40rpx auto;
    width: 50px;
    height: 50px;
    border: 1px solid #dddddd;
    border-radius: 50px;
    background-color: #ffffff;
  }

  .oauth-image image {
    width: 30px;
    height: 30px;
    margin: 10px;
  }

  .oauth-image button {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
  }

  .captcha-view {
    line-height: 0;
    justify-content: center;
    align-items: center;
    display: flex;
    position: relative;
    background-color: #f3f3f3;
  }
}
</style>
