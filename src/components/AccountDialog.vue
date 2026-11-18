<script setup>
import { nextTick, reactive, ref } from 'vue'
import { CURRENCIES, useAccounts } from '../composables/useAccounts'
import { categoryLabels } from '../finance'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['saved'])
const { addAccount } = useAccounts()
const dialog = ref(null)
const nameInput = ref(null)
const error = ref('')
const form = reactive({ name: '', category: 'securities', balance: '', currency: 'RUB' })

function open(category = 'securities', currency = 'RUB') {
  Object.assign(form, { name: '', category, balance: '', currency })
  error.value = ''
  dialog.value.showModal()
  nextTick(() => nameInput.value?.focus())
}

function save() {
  const balance = form.balance.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(balance)) {
    error.value = 'Укажите неотрицательную сумму: например, 12500 или 12500,50.'
    return
  }
  const result = addAccount({ ...form, balance: Number(balance) })
  if (!result.ok) {
    error.value = result.error
    return
  }
  dialog.value.close()
  emit('saved', result.account)
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="account-dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
    <form class="account-form" @submit.prevent="save">
      <header class="dialog-header">
        <div><p class="page-eyebrow">Наш капитал</p><h2 id="dialog-title">Добавить счёт</h2></div>
        <button class="icon-button" type="button" aria-label="Закрыть" @click="dialog.close()"><AppIcon name="close" /></button>
      </header>
      <p id="dialog-description" class="dialog-description">Укажите текущую стоимость активов или остаток на счёте.</p>
      <div class="form-fields">
        <label class="form-field"><span>Название</span><input ref="nameInput" v-model="form.name" name="account-name" placeholder="Например, наш брокерский счёт" maxlength="80" required autocomplete="off" /></label>
        <label class="form-field"><span>Категория</span><select v-model="form.category" name="category"><option v-for="(label, id) in categoryLabels" :key="id" :value="id">{{ label }}</option></select></label>
        <div class="form-row">
          <label class="form-field"><span>Остаток / стоимость</span><input v-model="form.balance" name="balance" type="text" inputmode="decimal" placeholder="0,00" maxlength="18" required autocomplete="off" :aria-invalid="error ? 'true' : undefined" :aria-describedby="error ? 'account-error' : undefined" /></label>
          <label class="form-field"><span>Валюта</span><select v-model="form.currency" name="currency"><option v-for="currency in CURRENCIES" :key="currency" :value="currency">{{ currency }}</option></select></label>
        </div>
      </div>
      <p v-if="error" id="account-error" class="form-error" role="alert">{{ error }}</p>
      <p class="form-help">Данные сохраняются только в этом браузере. Валюты учитываются отдельно.</p>
      <footer class="dialog-actions">
        <button class="secondary-button" type="button" @click="dialog.close()">Отмена</button>
        <button class="primary-button" type="submit">Сохранить счёт</button>
      </footer>
    </form>
  </dialog>
</template>
