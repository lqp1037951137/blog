# Hello VitePress

<input type="file" @input="input">



<script>
import SparkMD5 from 'spark-md5';
import axios from 'axios';

let shardList = [];
let file = null;
let fileMd5 = "";

export default {
  mounted() {
    console.log(SparkMD5);
  },
  methods: {
    /**
     * 处理文件选择事件。
     * 计算文件的MD5哈希值并将其分割为多个分片。
     * 将每个分片上传到服务器。
     * 
     * @param {Event} e - 文件选择事件对象。
     */
    async input(e) {
      file = e.target.files[0];
      fileMd5 = await this.md5(file);
      let shardSize = 1024 * 1024 * 2; // 2MB
      let shardCount = Math.ceil(file.size / shardSize);
      
      for (let i = 0; i < shardCount; i++) {
        let start = i * shardSize;
        let end = Math.min(file.size, start + shardSize);
        let shard = file.slice(start, end);
        shardList.push(shard);
      }
       await this.upload(shardList[0], 0);
      // for (let i = 0; i < shardList.length; i++) {
      //   await this.upload(shardList[i], i);
      // }
    },
    
    /**
     * 将分片上传到服务器。
     * 
     * @param {Blob} shard - 要上传的分片。
     * @param {number} index - 分片的索引。
     * @returns {Promise} - 上传完成后解析的Promise。
     */
    upload(shard, index) {
      return new Promise(async (resolve, reject) => {
        let formData = new FormData();
        formData.append('shard', shard);
        formData.append('index', index);
        formData.append('total', shardList.length);
        formData.append('filename', file.name);
        formData.append('fileMd5', fileMd5);
        formData.append('md5', await this.md5(shard));
        
        axios.post('http://localhost:3000/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: function (progressEvent) {
            let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(percentCompleted);
          }
        }).then(res => {
          resolve(res);
        }).catch(err => {
          reject(err);
        });
      });
    },
    
    /**
     * 计算文件的MD5哈希值。
     * 
     * @param {File} file - 要计算MD5哈希值的文件。
     * @returns {Promise} - 解析带有MD5哈希值的Promise。
     */
    md5(file) {
      return new Promise((resolve, reject) => {
        let spark = new SparkMD5.ArrayBuffer();
        let reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = function (e) {
          spark.append(e.target.result);
          resolve(spark.end());
        };
      });
    }
  }
};
</script>