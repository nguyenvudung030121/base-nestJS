// src/common/pagination/page.dto.ts
import { PageMetaDto } from './page-meta.dto';

export class PageDto<T> {
  /** Danh sách items của trang hiện tại */
  readonly items: T[];

  /** Thông tin phân trang (page, totalPages, hasNext, ...) */
  readonly meta: PageMetaDto;

  constructor(items: T[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
