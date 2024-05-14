# Hello VitePress

<input type="file" @input="input">
<button class="btn" @click="startUpload">上传</button>

## 上传进度
{{ uploadedIndex }} / {{ uploadTotal }} 




<script>
import SparkMD5 from 'spark-md5';
import axios from 'axios';

let shardList = [];
let file = null;
let fileMd5 = "";

export default {
  data() {
    return {
      uploadedIndex: 0,
      uploadTotal: 0
    };
  },
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
      this.uploadTotal = shardList.length;
    },
    async startUpload(){
      if(!file) {
        alert('请选择文件');
        return;
      }
      
      //  await this.upload(shardList[0], 0);
      for (let i = 0; i < shardList.length; i++) {
        await this.upload(shardList[i], i);
      }
      //合并
      axios.post('http://localhost:3000/merge?fileMd5=' + fileMd5 + '&fileName=' + file.name).then(res => {
        console.log(res);
      });
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
        //检测是否已经上传过
        this.uploadedIndex = index + 1;
        let res = await axios.get('http://localhost:3000/check', {
          params: {
            md5: await this.md5(shard),
            fileMd5: fileMd5,
            index: index
          }
        });
        if(res.data.code === 200 && res.data.exist) {
          resolve(res);
          return;
        }

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
            if (progressEvent.lengthComputable) {
              console.log(progressEvent.loaded / progressEvent.total * 100 + '%');
            }
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

<style>
.btn {
  padding: 6px 20px;
  background-color: #409eff;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
</style>