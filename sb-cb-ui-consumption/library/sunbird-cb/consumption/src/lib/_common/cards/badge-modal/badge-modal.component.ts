import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core'
import { PipePublicURLModule } from '@sunbird-cb/utils-v2'
import { BadgeService } from '../../../_services/badge.service'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
import jsPDF from 'jspdf'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'

@Component({
  selector: 'sb-uic-app-badge-modal',
  templateUrl: './badge-modal.component.html',
  styleUrls: ['./badge-modal.component.scss'],
  standalone: true,
  imports: [PipePublicURLModule, MatIconModule, MatMenuModule]
})
export class BadgeModalComponent implements OnInit {
  @Input() badgeData: any
  ngOnInit(): void {
  }
  @Output() close = new EventEmitter<void>()

  constructor(private badgeService: BadgeService, private configSvc: ConfigurationsService) { }

  downloadBadgePng(badgeData: any) {
    const payload = {
      request: {
        userId: this.configSvc?.userProfile?.userId,
        courseId: this.badgeData?.courseId,
        badgeId: this.badgeData?.badgeId,
      },
    }
    this.badgeService.generateBadge(payload).subscribe((res: any) => {
      const dataUrl = res?.result?.printUri

      const img = new Image()
      img.src = dataUrl

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)

          const png = canvas.toDataURL('image/png')

          const a = document.createElement('a')
          a.href = png
          a.download = 'badge.png'
          a.click()
        }
      }
    })
  }
  
    downloadBadgeSvg(badgeData: any) {
    console.log("downloadBadge")
    const payload = {
      request: {
        userId: this.configSvc?.userProfile?.userId,
        courseId: this.badgeData?.courseId,
        badgeId: this.badgeData?.badgeId,
      },
    }
   console.log('payload========', payload, badgeData, this.configSvc)
   this.badgeService.generateBadge(payload).subscribe({
    next: (res: any) => {
      const dataUrl = res?.result?.printUri  

      const a = document.createElement('a')
      a.href = dataUrl
a.download = 'badge.svg'
     
      document.body.appendChild(a)
      a.click()
      a.remove()
    },
    error: (err) => {
      console.error('Download failed', err)
    },
  })
  }
  downloadBadgePdf(badgeData: any) {
    const payload = {
      request: {
        userId: this.configSvc?.userProfile?.userId,
        courseId: badgeData.courseId,
        badgeId: badgeData.badgeId,
      },
    }
    this.badgeService.generateBadge(payload).subscribe((res: any) => {
      const dataUrl = res?.result?.printUri

      const img = new Image()
      img.src = dataUrl

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width || 1920
        canvas.height = img.height || 1080

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)

          const imgData = canvas.toDataURL('image/png')

          const pdf = new jsPDF('landscape', 'px', 'a4')
          const pageWidth = pdf?.internal?.pageSize?.getWidth()
          const pageHeight = pdf?.internal?.pageSize?.getHeight()

          // original image size
          const imgWidth = img?.width
          const imgHeight = img?.height

          // calculate scale to FIT (not stretch)
          const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight)

          // new size
          const newWidth = imgWidth * scale
          const newHeight = imgHeight * scale

          // center it
          const x = (pageWidth - newWidth) / 2
          const y = (pageHeight - newHeight) / 2

          pdf.addImage(imgData, 'PNG', x, y, newWidth, newHeight)
          pdf.save('badge.pdf')
        }
      }
    })
  }
getUserId(): string {
  return this.configSvc?.userProfile?.userId || ''
}
  closeModal() {
    this.close.emit()
  }
}