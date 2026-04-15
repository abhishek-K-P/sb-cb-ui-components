export interface IContentRating {
  activityId: string
  activityType: string
  latest50Reviews: string
  avgRating: number | string
  breakDown: any[]
  sum_of_total_ratings: number | null
  total_number_of_ratings: number | null
  totalcount1stars: number | null
  totalcount2stars: number | null
  totalcount3stars: number | null
  totalcount4stars: number | null
  totalcount5stars: number | null
}
