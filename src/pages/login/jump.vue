<template>
  <view class="auth-page">
    <view class='content content-text'>
      <view class="ct-item">申请获取以下权限</view>
      <view class="ct-item">获得你的公开信息(昵称，头像等)</view>
    </view>
    <!-- #ifdef MP-WEIXIN -->
    <view class="content-last_text">
      <button class='bottom' :loading="logoutBtnLoading" type='primary' open-type="getUserInfo" lang="zh_CN" @getuserinfo="getUserInfo">
        授权登录
      </button>
    </view>
    <!-- #endif -->
  </view>
</template>

<script>

import {
  mapState,
  mapMutations
} from 'vuex';
export default {
  name: "jump",
  data() {
    return {
      username:'',
      logoutBtnLoading: false
    }
  },
  methods:{
    ...mapMutations(['login']),
    getUserInfo({detail}) {
      if (detail.userInfo) {
        this.loginByWeixin('weixin');
      }
    },
    loginByWeixin(value) {
      let _this = this;
      this.logoutBtnLoading = true;
      this.oauth(value).then((code) => {
        _this.beginAuth(code);
      });
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
    userLogin(data,isJm){
      let _this = this;
      wx.request({
        data: data,
        method: "GET",
        header: {'content-type': 'application/json'},
        url: this.baseUrl + '/users/login',
        success: function(res) {
          _this.logoutBtnLoading = false;
          res.data.isLogin && _this.toMain(_this.username);
        }
      });
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
    }
  }
}
</script>

<style lang="scss">
.auth-page{
  display: flex;
  flex: 1;
  flex-direction: column;
  .content-text{
    flex: 1;
    background: white;
    .ct-item{
      margin: 10rpx auto;
    }
  }
  .content-last_text{
    flex: 1;
    margin: 40rpx auto;
  }
}
</style>