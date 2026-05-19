import { schedulerHttp } from "@/api/http";
import type { SchedulerJobType, SchedulerSettingsListDto } from "@/api/types";

export async function listSchedulerSettings(): Promise<{
  status: number;
  data: SchedulerSettingsListDto;
}> {
  const res = await schedulerHttp.get<SchedulerSettingsListDto>(
    "settings/list",
    {
      validateStatus: (status) => status === 200 || status === 500,
    },
  );
  return { status: res.status, data: res.data };
}

export async function updateSchedulerNextRun(
  jobType: SchedulerJobType,
  value: string,
): Promise<void> {
  await schedulerHttp.put(
    "settings/next-run",
    { value },
    { params: { jobType } },
  );
}

export async function updateSchedulerInterval(
  jobType: SchedulerJobType,
  value: string,
): Promise<void> {
  await schedulerHttp.put(
    "settings/interval",
    { value },
    { params: { jobType } },
  );
}

export async function runSchedulerJob(
  jobType: SchedulerJobType,
): Promise<void> {
  await schedulerHttp.post("execute", null, { params: { jobType } });
}
