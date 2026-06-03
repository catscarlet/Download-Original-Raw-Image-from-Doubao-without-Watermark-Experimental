// ==UserScript==
// @name            从豆包下载无水印原图和无水印视频实验版 Download Raw Image and Raw Video from doubao.com without Watermark Experimental
// @name:en         Download Raw Image and Raw Video from doubao.com without Watermark Experimental 从豆包下载无水印原图和无水印视频实验版
// @namespace       https://github.com/catscarlet/Download-Original-Raw-Image-from-Doubao-without-Watermark-Experimental
// @description     这个脚本可以让你尝试从豆包（www.doubao.com）下载无水印原图和无水印视频 You can try this userscript to Download Original Raw Image and Raw Video from doubao.com without Watermark.
// @description:en  You can try this userscript to Download Original Raw Image and Raw Video from doubao.com without Watermark. 这个脚本可以让你尝试从豆包（www.doubao.com）下载无水印原图和无水印视频
// @version         0.1.0
// @author          catscarlet
// @license         GNU Affero General Public License v3.0
// @match           https://www.doubao.com/chat/*
// @run-at          document-end
// @grant           none
// ==/UserScript==

const customPostfixName = '';
const OriginalXHR = window.XMLHttpRequest;
window.globalImageBucket = {};
window.globalVideoBucket = {};
window.globalVideoKeyValveBucket = {};

(function() {
    'use strict';

    let throttleTimer;
    let debounceTimer;
    const thresholdValue = 750;

    const observer = new MutationObserver((mutationsList) => {
        const now = Date.now();

        if (!throttleTimer || now - throttleTimer > thresholdValue) {
            throttleTimer = now;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {

                        let itemContainer = [];
                        let itemItem = document.querySelectorAll('div.relative.flex.h-full.w-full.items-center.justify-center.overflow-hidden');

                        for (const itemValue of itemItem.values()) {
                            itemContainer.push(itemValue);
                        }

                        if (itemContainer.length == 0) {
                            return false;
                        }

                        itemContainer.forEach((itemInContainer) => {
                            if (itemInContainer.parentNode.querySelector('.doubao-nowatermark-555118')) {
                                return;
                            }

                            if (itemInContainer.querySelector('canvas')) {
                                const link = createRawImageDownloadButton();
                                itemInContainer.parentNode.appendChild(link);

                                return;
                            }

                            if (itemInContainer.querySelector('video')) {
                                const links = createRawVideoDownloadButtons(itemInContainer);
                                itemInContainer.parentNode.appendChild(links);

                                return;
                            }
                        });
                    }
                }
            }, thresholdValue);
        }
    });

    const config = {
        childList: true,
        attributes: false,
        subtree: true,
    };

    observer.observe(document.documentElement, config);

    window.XMLHttpRequest = function() {
        return createModifiedXHR();
    };

    setCanvasDataset();
})();

function createModifiedXHR() {
    const xhr = new OriginalXHR();

    const originalOpen = xhr.open;

    xhr.open = function(method, url) {
        this._method = method;
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    const originalSend = xhr.send;

    xhr.send = function(body) {

        if (this._method && this._method.toUpperCase() === 'POST' &&
            this._url && this._url.includes('/im/chain/single?')) {

            xhr.addEventListener('load', function() {
                if (xhr.readyState === 4) {

                    const jsonData = JSON.parse(xhr.responseText);

                    if (Object.hasOwn(jsonData, 'downlink_body')) {
                        let messages = jsonData.downlink_body.pull_singe_chain_downlink_body.messages;

                        messages.forEach((message, i) => {

                            if (message.user_type == 2 && Object.hasOwn(message, 'content_block') && message.content_block) {
                                let content_block = message.content_block;

                                if (Array.isArray(content_block)) {
                                    if (content_block.length >= 2 && Object.hasOwn(content_block[1], 'content')  && Object.hasOwn(content_block[1].content, 'creation_block') && Object.hasOwn(content_block[1].content.creation_block, 'creations')) {

                                        let creations = content_block[1].content.creation_block.creations;
                                        creations.forEach((item, j) => {
                                            if (item.type == 1) {
                                                const imageKey = getKeyFromUrl(item.image.image_preview.url);
                                                window.globalImageBucket[imageKey] = item.image;
                                            } else if (item.type == 2) {
                                                let vid = item.video.vid;
                                                window.globalVideoBucket[vid] = item.video;
                                            } else {
                                                //console.log('item.type unknown. item.type ==' + item.type);
                                            }
                                        });

                                    } else {
                                        //console.log('something wrong about content_block');
                                        //console.log(content_block);
                                    }
                                } else if (Object.hasOwn(content, 'image_list')) {
                                    let imageList = content.image_list;
                                    imageList.forEach((image, j) => {
                                        window.globalImageBucket[image.key] = image.image;
                                    });

                                } else {
                                    console.log(content);
                                }

                            } else {
                                //console.log('message does not match');
                            }

                        });

                    } else {
                        console.log('jsonData does not have downlink_body');
                    }


                }
            });
        } else if (this._method && this._method.toUpperCase() === 'POST' &&
            this._url && this._url.includes('/samantha/video/get_play_info?')) {

            xhr.addEventListener('load', function() {
                if (xhr.readyState === 4) {
                    const thisRequestDataRaw = this._data;
                    const thisRequestData = JSON.parse(thisRequestDataRaw);
                    const vid = thisRequestData.vid;
                    const jsonData = JSON.parse(xhr.responseText);
                    const main = jsonData.data.play_infos[0].main;
                    const urlKey = getKeyFromUrl(main);
                    window.globalVideoKeyValveBucket[urlKey] = vid;
                }
            });
        }

        return originalSend.apply(this, arguments);
    };

    return xhr;
}

function setCanvasDataset() {
    const originalCanvasRenderingContext2D = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(img, ...args) {
        const targetCanvas = this.canvas;
        const src = img && (img.currentSrc || img.src) || (img && img.toDataURL && '[canvas/image source]');
        targetCanvas.dataset['src-555118'] = src;

        return originalCanvasRenderingContext2D.call(this, img, ...args);
    };
}

function createRawImageDownloadButton() {
    const link = document.createElement('a');

    link.textContent = '点击下载以「会话名-会话ID-下载时间」为文件名的无水印原图';
    link.style.whiteSpace = 'break-spaces';

    link.classList.add('doubao-nowatermark-555118');

    link.style.position = 'absolute';
    link.style.backgroundColor = 'darkviolet';
    link.style.color = 'white';
    link.style.padding = '7px 14px';
    link.style.border = 'none';
    link.style.borderRadius = '5px';

    link.style.zIndex = 1;
    link.style.textDecoration = 'none';
    link.style.opacity = '0.8';

    const x = 0;
    const y = 0;

    link.style.left = x + 'px';
    link.style.top = 'calc(2em + 7px)';

    link.addEventListener('mouseover', function() {
        if (this.style.cursor == 'not-allowed') {
            return;
        }
        this.style.backgroundColor = 'violet';
        this.style.cursor = 'pointer';
    });

    link.addEventListener('mouseout', function() {
        if (this.style.cursor == 'not-allowed') {
            return;
        }
        this.style.backgroundColor = 'darkviolet';
        this.style.cursor = '';
    });

    link.addEventListener('click', async () => {
        getCrossOriginImage(link);
    });

    return link;
}

function createRawVideoDownloadButtons(video) {
    const videoTarget = video.querySelector('video');
    const videoUrl = videoTarget.src;
    const urlKey = getKeyFromUrl(videoUrl);
    const vid = window.globalVideoKeyValveBucket[urlKey];

    const links = document.createElement('div');
    links.style.position = 'absolute';
    const x = 0;
    const y = 0;
    links.style.left = x + 'px';
    links.style.top = 'calc(2em + 7px)';

    let main_url = getUrlByVid(vid);
    let b = createOneRawVideoDownloadButton(vid, main_url);
    links.appendChild(b);
    return links;
}

function createOneRawVideoDownloadButton(k, v) {
    const link = document.createElement('a');
    link.k = k;
    link.v = v;
    link.textContent = '点击下载以「会话名-会话ID-下载时间」为文件名的无水印视频';
    link.style.whiteSpace = 'break-spaces';
    link.classList.add('doubao-nowatermark-555118');
    link.style.backgroundColor = 'darkviolet';
    link.style.color = 'white';
    link.style.padding = '7px 14px';
    link.style.border = 'none';
    link.style.borderRadius = '5px';
    link.style.zIndex = 1;
    link.style.textDecoration = 'none';
    link.style.opacity = '0.8';
    link.style.display = 'block';

    link.addEventListener('mouseover', function() {
        if (this.style.cursor == 'not-allowed') {
            return;
        }
        this.style.backgroundColor = 'violet';
        this.style.cursor = 'pointer';
    });

    link.addEventListener('mouseout', function() {
        if (this.style.cursor == 'not-allowed') {
            return;
        }
        this.style.backgroundColor = 'darkviolet';
        this.style.cursor = '';
    });

    link.addEventListener('click', async () => {
        getCrossOriginVideo(link);
    });

    return link;
}

async function getCrossOriginImage(link) {

    const btnOriginStyle = {};
    btnOriginStyle.cursor = link.style.cursor;
    btnOriginStyle.backgroundColor = link.style.backgroundColor;
    link.style.cursor = 'not-allowed';
    link.style.backgroundColor = 'grey';

    const imageNode = link.parentNode.querySelector('canvas');
    const imageKey = getKeyFromUrl(imageNode.dataset['src-555118']);
    const imageUrlV2 = getImageOriRawUrlByImageKey(imageKey);

    if (imageUrlV2 === false) {
        console.error('抱歉，不支持这张图片的无水印原图下载。');
        alert('抱歉，不支持这张图片的无水印原图下载。');

        return false;
    }

    let imageName = getImageName();
    if (customPostfixName) {
        imageName = imageName + '-' + customPostfixName;
    }
    imageName = imageName + '-无水印原图.png';

    try {
        const response = await fetch(imageUrlV2, {mode: 'cors'});
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = imageName;
        a.style.display = 'none';
        document.body.appendChild(a);
        setTimeout(() => {
            a.click();
        }, 10);
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            link.style.cursor = btnOriginStyle.cursor;
            link.style.backgroundColor = btnOriginStyle.backgroundColor;
        }, 1000);

    } catch (error) {
        console.error('图片加载失败，请确保图片服务器开启了 CORS 支持。');
        alert('图片加载失败，请确保图片服务器开启了 CORS 支持。');
        link.style.cursor = btnOriginStyle.cursor;
        link.style.backgroundColor = btnOriginStyle.backgroundColor;
    }

}

async function getCrossOriginVideo(link) {
    const btnOriginStyle = {};
    btnOriginStyle.cursor = link.style.cursor;
    btnOriginStyle.backgroundColor = link.style.backgroundColor;
    link.style.cursor = 'not-allowed';
    link.style.backgroundColor = 'grey';

    let videoUrl = await link.v;

    let videoName = getVideoName(link);
    if (customPostfixName) {
        videoName = videoName + '-' + customPostfixName;
    }
    videoName = videoName + '-无水印.mp4';

    if (!videoUrl) {
        console.error('抱歉，获取视频播放信息失败');
        alert('抱歉，获取视频播放信息失败');
    }

    try {
        const response = await fetch(videoUrl, {mode: 'cors', referrer: ''});
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = videoName;
        a.style.display = 'none';
        document.body.appendChild(a);
        setTimeout(() => {
            a.click();
        }, 10);
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            link.style.cursor = btnOriginStyle.cursor;
            link.style.backgroundColor = btnOriginStyle.backgroundColor;
        }, 1000);

    } catch (error) {
        console.error('加载失败，请确保服务器开启了 CORS 支持。');
        alert('加载失败，请确保服务器开启了 CORS 支持。');
        link.style.cursor = btnOriginStyle.cursor;
        link.style.backgroundColor = btnOriginStyle.backgroundColor;
    }

}

function getImageName() {
    const currentTitle = document.title.replace('- 豆包', '').trim();
    const chatID = document.location.pathname.replace('/chat/', '').trim();
    const timeStr = getYmdHMS();

    const imageName = currentTitle + '-' + chatID + '-' + timeStr;

    return imageName;
}

function getVideoName(link) {
    const currentTitle = document.title.replace('- 豆包', '').trim();
    const chatID = document.location.pathname.replace('/chat/', '').trim();
    const timeStr = getYmdHMS();

    const videoName = currentTitle + '-' + chatID + '-' + timeStr;

    return videoName;
}

function getImageOriRawUrlByImageKey(ImageKey) {
    if (Object.hasOwn(window.globalImageBucket, ImageKey)) {
        if (window.globalImageBucket[ImageKey] != undefined) {
            const image_ori_raw = window.globalImageBucket[ImageKey].image_ori_raw.url;

            return image_ori_raw;
        } else {
            console.log('image_ori_raw not found in window.globalImageBucket.' + ImageKey);

            return false;
        }
    } else {
        console.log('ImageKey not found in globalImageBucket');

        return false;
    }
}

function getYmdHMS() {
    const date = new Date();
    const Y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const H = String(date.getHours()).padStart(2, '0');
    const M = String(date.getMinutes()).padStart(2, '0');
    const S = String(date.getSeconds()).padStart(2, '0');

    const result = `${Y}${m}${d}${H}${M}${S}`;

    return result;
}

function getKeyFromUrl(url) {
    const UrlObj = new URL(url);
    const urlKey = UrlObj.pathname;

    return urlKey;
}

async function getUrlByVid(vid) {
    const url = 'https://www.doubao.com/samantha/media/get_play_info?version_code=20800&language=zh-CN&device_platform=web&aid=497858&real_aid=497858&pkg_type=release_version&device_id=&pc_version=2.51.7&region=&sys_region=&samantha_web=1&use-olympus-account=1&web_tab_id=';

    try {
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'origin': 'https://www.doubao.com',
            },
            body: JSON.stringify({key: vid}),
        });

        let result = await response.json();

        if (!result || !result.data) {
            console.log('API failed');
            console.log(result);

            return false;
        }

        let main_url = await result.data.original_media_info.main_url;

        return main_url;
    } catch (e) {
        console.error('获取视频播放信息失败:', e);

        return null;
    }
}
