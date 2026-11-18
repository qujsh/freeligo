<script setup lang="ts">
import { computed, ref } from "vue";
import { Camera } from "lucide-vue-next";
import {
  accountProfile,
  ownAvatarUrl,
  type AccountProfile,
  type ProfileInput,
} from "../../../services/accountProfile";
import MemberAvatar from "./MemberAvatar.vue";
const props = defineProps<{
  profile: AccountProfile;
  busy: boolean;
  error?: string;
}>();
const emit = defineEmits<{ save: [value: ProfileInput]; cancel: [] }>();
const nickname = ref(props.profile.nickname),
  bio = ref(props.profile.bio || ""),
  mediaNo = ref(props.profile.avatarMediaNo || "");
const uploading = ref(false),
  uploadError = ref("");
const avatar = computed(() => ownAvatarUrl(mediaNo.value));
/** 已上传头像仅暂存于表单，保存资料成功才绑定；取消不修改当前资料。 */
async function upload(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  input.value = "";
  if (!file || uploading.value) return;
  uploading.value = true;
  uploadError.value = "";
  try {
    mediaNo.value = await accountProfile.uploadAvatar(file);
  } catch (error) {
    uploadError.value = (error as Error).message;
  } finally {
    uploading.value = false;
  }
}
function submit() {
  if (!nickname.value.trim()) {
    uploadError.value = "请填写昵称";
    return;
  }
  emit("save", {
    nickname: nickname.value.trim(),
    bio: bio.value.trim(),
    avatarMediaNo: mediaNo.value,
  });
}
</script>
<template>
  <form class="profile-editor" @submit.prevent="submit">
    <div class="profile-editor__photo">
      <MemberAvatar :src="avatar" :name="nickname" :size="88" />
      <div>
        <label class="profile-editor__upload"
          ><Camera :size="17" />{{ uploading ? "正在上传…" : "更换头像"
          }}<input
            aria-label="上传头像"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            :disabled="uploading || busy"
            @change="upload" /></label
        ><button
          v-if="mediaNo"
          type="button"
          class="profile-editor__remove"
          :disabled="uploading || busy"
          @click="mediaNo = ''"
        >
          移除头像
        </button>
        <p>JPG、PNG、WebP，最大 5MB</p>
      </div>
    </div>
    <label class="profile-editor__field"
      >昵称<el-input
        v-model="nickname"
        aria-label="昵称"
        maxlength="64"
        show-word-limit
        :disabled="busy"
    /></label>
    <label class="profile-editor__field"
      >个人简介<el-input
        v-model="bio"
        aria-label="个人简介"
        type="textarea"
        :rows="4"
        maxlength="500"
        show-word-limit
        placeholder="简单介绍一下自己，让大家更了解你。"
        :disabled="busy"
    /></label>
    <p v-if="uploadError || error" class="profile-editor__error" role="alert">
      {{ uploadError || error }}
    </p>
    <div class="profile-editor__footer">
      <button
        type="button"
        class="member-outline"
        :disabled="busy || uploading"
        @click="emit('cancel')"
      >
        取消
</button
      ><button
        type="submit"
        class="notes-primary"
        :disabled="busy || uploading"
      >
        {{ busy ? "保存中…" : "保存修改" }}
      </button>
    </div>
  </form>
</template>
<style scoped>
.profile-editor {
  display: grid;
  gap: 24px;
  padding: 8px 6px 4px;
}
.profile-editor__photo {
  display: flex;
  align-items: center;
  gap: 22px;
}
.profile-editor__upload {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #f14b12;
  font-size: 14px;
  cursor: pointer;
  position: relative;
}
.profile-editor__upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  cursor: pointer;
}
.profile-editor__photo p {
  font-size: 12px;
  color: #95989d;
  margin: 10px 0 0;
}
.profile-editor__remove {
  border: 0;
  background: none;
  font-size: 13px;
  color: #737782;
  margin-left: 14px;
  cursor: pointer;
}
.profile-editor__field {
  display: grid;
  gap: 10px;
  color: #34363b;
  font-size: 14px;
}
.profile-editor__error {
  color: #c43d2f;
  font-size: 14px;
  margin: 0;
}
.profile-editor__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}
</style>
