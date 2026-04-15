import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MdoLeaderboardComponent } from './mdo-leaderboard.component';
import { SkeletonLoaderLibModule } from '../skeleton-loader-lib/skeleton-loader-lib.module';
import { InsiteDataService } from '../../_services/insite-data.service';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MdoLeaderboardV2Component } from './mdo-leaderboard-v2/mdo-leaderboard-v2.component';



@NgModule({
  declarations: [MdoLeaderboardComponent, MdoLeaderboardV2Component],
  imports: [
    CommonModule,
    MatIconModule,
    SkeletonLoaderLibModule,
    FormsModule,
    MatTooltipModule
  ],
  exports: [
    MdoLeaderboardComponent,
    MdoLeaderboardV2Component
  ],
  providers: [InsiteDataService]
})
export class MdoLeaderboardModule { }
