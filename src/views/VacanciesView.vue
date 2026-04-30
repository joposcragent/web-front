<script setup lang="ts">
import JobPostingsTablePanel from '@/components/job-postings/JobPostingsTablePanel.vue'
</script>

<template>
  <div>
    <h1 class="text-h4 font-weight-regular mb-8">Вакансии</h1>
    <JobPostingsTablePanel preset="all" />
  </div>
</template>
