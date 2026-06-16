import axios from 'axios';
import { ElMessage } from "element-plus";

const instance = axios.create({
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器
instance.interceptors.request.use(
    config => {
        const apiKey = sessionStorage.getItem('api_key');
        if (apiKey) config.headers.Authorization = `Bearer ${apiKey}`;
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 响应拦截器
instance.interceptors.response.use(
    response => {
        return response.data;
    },
    error => {
        const message = error.response?.data?.error || error.message || '网络错误';
        ElMessage.error(message);
        return Promise.reject(error);
    }
);

// 封装常用的 HTTP 方法
export const get = async (url, params = {}) => {
    try {
        const response = await instance.get(url, { params });
        return response;
    } catch (error) {
        throw new Error(`HTTP GET error: ${error}`);
    }
};

export const post = async (url, data = {}, config = {}) => {
    try {
        const response = await instance.post(url, data, config);
        return response;
    } catch (error) {
        throw new Error(`HTTP POST error: ${error}`);
    }
};

export const put = async (url, data = {}) => {
    try {
        const response = await instance.put(url, data);
        return response;
    } catch (error) {
        throw new Error(`HTTP PUT error: ${error}`);
    }
};

export const del = async (url, params = {}) => {
    try {
        const response = await instance.delete(url, { headers: { 'Content-Type': 'application/json' }, params });
        return response;
    } catch (error) {
        throw new Error(`HTTP DELETE error: ${error}`);
    }
};
