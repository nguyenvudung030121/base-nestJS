// src/common/pagination/page-meta.dto.ts
import { PageOptionsDto } from './page-options.dto';

export interface PageMetaDtoParameters {
  pageOptionsDto: PageOptionsDto;
  itemCount: number;
}

export class PageMetaDto {
  /** Trang hiện tại */
  readonly page: number;

  /** Số lượng item trên 1 trang */
  readonly limit: number;

  /** Tổng số bản ghi trong DB (theo điều kiện lọc) */
  readonly totalItems: number;

  /** Tổng số trang */
  readonly totalPages: number;

  /** Có trang trước không? */
  readonly hasPreviousPage: boolean;

  /** Có trang sau không? */
  readonly hasNextPage: boolean;

  constructor({ pageOptionsDto, itemCount }: PageMetaDtoParameters) {
    this.page = pageOptionsDto.page;
    this.limit = pageOptionsDto.limit;
    this.totalItems = itemCount;
    this.totalPages = Math.ceil(itemCount / this.limit);
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.totalPages;
  }
}
