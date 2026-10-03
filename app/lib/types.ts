export type Client = {
  id: string;
  trainer_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  gender: string;
  format: string | null;
  start_date: string | null;
  end_date: string | null;
  rest: number;
  paid: string | null;
  note: string | null;
  height: string | null;
  weight: string | null;
  medical: string | null;
  injuries: string | null;
  lifestyle: string | null;
  cycle_note: string | null;
  strategy: string | null;
  goal1: string | null;
  metric1: string | null;
  goal1_value: string | null;
  goal1_current: string | null;
};

export type Trainer = {
  id: string;
  user_id: string;
  phone: string;
  name: string;
};

export type Shift = {
  id: string;
  trainer_id: string;
  date: string;
  start_time: string;
  end_time: string;
};

export type Cycle = {
  id: string;
  client_id: string;
  start_date: string;
  end_date: string | null;
  last_day: number | null;
};

export type Request = {
  id: string;
  trainer_id: string;
  client_id: string;
  date: string | null;
  time: string | null;
  status: string;
  created_at: string;
};

export type Template = {
  id: string;
  trainer_id: string;
  name: string;
};

export type TemplateItem = {
  id: string;
  template_id: string;
  day: number;
  ord: number;
  name: string;
  sets: string | null;
  reps: string | null;
  weight: string | null;
  note: string | null;
};