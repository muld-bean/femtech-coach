export type Client = {
  id: string;
  trainer_id: string;
  name: string;
  phone: string | null;
  gender: string;
  format: string | null;
  start_date: string | null;
  end_date: string | null;
  rest: number;
  paid: string | null;
  note: string | null;
};

export type Trainer = {
  id: string;
  user_id: string;
  phone: string;
  name: string;
};

export type ScheduleItem = {
  id: string;
  trainer_id: string;
  client_id: string;
  date: string;
  time: string;
  status: string;
  format: string | null;
};

export type Measurement = {
  id: string;
  client_id: string;
  date: string;
  weight: string | null;
  waist: string | null;
  chest: string | null;
  glutes: string | null;
  thigh: string | null;
};