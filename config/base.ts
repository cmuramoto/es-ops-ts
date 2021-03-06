export enum DateFormat {
  basic_date = "basic_date",
  basic_date_time = "basic_date_time",
  basic_date_time_no_millis = "basic_date_time_no_millis",
  basic_ordinal_date = "basic_ordinal_date",
  basic_ordinal_date_time = "basic_ordinal_date_time",
  basic_ordinal_date_time_no_millis = "basic_ordinal_date_time_no_millis",
  basic_t_time = "basic_t_time",
  basic_t_time_no_millis = "basic_t_time_no_millis",
  basic_time = "basic_time",
  basic_time_no_millis = "basic_time_no_millis",
  basic_week_date = "basic_week_date",
  basic_week_date_time = "basic_week_date_time",
  basic_week_date_time_no_millis = "basic_week_date_time_no_millis",
  date = "date",
  date_hour = "date_hour",
  date_hour_minute = "date_hour_minute",
  date_hour_minute_second = "date_hour_minute_second",
  date_hour_minute_second_fraction = "date_hour_minute_second_fraction",
  date_hour_minute_second_millis = "date_hour_minute_second_millis",
  date_optional_time = "date_optional_time",
  date_time = "date_time",
  date_time_no_millis = "date_time_no_millis",
  epoch_millis = "epoch_millis",
  epoch_second = "epoch_second",
  hour = "hour",
  hour_minute_second = "hour_minute_second",
  hour_minute_second_fraction = "hour_minute_second_fraction",
  hour_minute_second_millis = "hour_minute_second_millis",
  ordinal_date = "ordinal_date",
  ordinal_date_time = "ordinal_date_time",
  ordinal_date_time_no_millis = "ordinal_date_time_no_millis",
  strict_basic_week_date = "strict_basic_week_date",
  strict_basic_week_date_time = "strict_basic_week_date_time",
  strict_basic_week_date_time_no_millis = "strict_basic_week_date_time_no_millis",
  strict_date = "strict_date",
  strict_date_hour = "strict_date_hour",
  strict_date_hour_minute = "strict_date_hour_minute",
  strict_date_hour_minute_second = "strict_date_hour_minute_second",
  strict_date_hour_minute_second_fraction = "strict_date_hour_minute_second_fraction",
  strict_date_hour_minute_second_millis = "strict_date_hour_minute_second_millis",
  strict_date_optional_time = "strict_date_optional_time",
  strict_date_time = "strict_date_time",
  strict_date_time_no_millis = "strict_date_time_no_millis",
  strict_hour = "strict_hour",
  strict_hour_minute_second = "strict_hour_minute_second",
  strict_hour_minute_second_fraction = "strict_hour_minute_second_fraction",
  strict_hour_minute_second_millis = "strict_hour_minute_second_millis",
  strict_ordinal_date = "strict_ordinal_date",
  strict_ordinal_date_time = "strict_ordinal_date_time",
  strict_ordinal_date_time_no_millis = "strict_ordinal_date_time_no_millis",
  strict_t_time = "strict_t_time",
  strict_t_time_no_millis = "strict_t_time_no_millis",
  strict_time = "strict_time",
  strict_time_no_millis = "strict_time_no_millis",
  strict_week_date = "strict_week_date",
  strict_week_date_time = "strict_week_date_time",
  strict_week_date_time_no_millis = "strict_week_date_time_no_millis",
  strict_weekyear = "strict_weekyear",
  strict_weekyear_week = "strict_weekyear_week",
  strict_weekyear_week_day = "strict_weekyear_week_day",
  strict_year = "strict_year",
  strict_year_month = "strict_year_month",
  strict_year_month_day = "strict_year_month_day",
  t_time = "t_time",
  t_time_no_millis = "t_time_no_millis",
  time = "time",
  time_no_millis = "time_no_millis",
  week_date = "week_date",
  week_date_time = "week_date_time",
  week_date_time_no_millis = "week_date_time_no_millis",
  weekyear = "weekyear",
  weekyear_week = "weekyear_week",
  weekyear_week_day = "weekyear_week_day",
  year = "year",
  year_month = "year_month",
  year_month_day = "year_month_day"
}

export enum GeneralType {
  any = "*",
  boolean = "boolean",
  date = "date",
  double = "double",
  long = "long",
  object = "object",
  string = "string"
}

export enum Type {
  binary = "binary",
  boolean = "boolean",
  byte = "byte",
  completion = "completion",
  date = "date",
  double = "double",
  dynamic = "{dynamic_type}",
  float = "float",
  geo_point = "geo_point",
  geo_shape = "geo_shape",
  integer = "integer",
  ip = "ip",
  join = "join",
  keyword = "keyword",
  long = "long",
  nested = "nested",
  object = "object",
  short = "short",
  text = "text",
  token_count = "token_count"
}

export enum IndexOptions {
  docs = "docs",
  freqs = "freqs",
  offsets = "offsets",
  positions = "positions"
}

export enum StoreType {
  default_fs = "default_fs",
  mmapfs = "mmapfs",
  niofs = "niofs",
  simplefs = "simplefs"
}
