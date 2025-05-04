odoo.define('pos_customer_screen.VideoSlider', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const { useState } = owl;

    class VideoSlider extends PosComponent {
        setup() {
            super.setup();
            this.state = useState({
                activeVideo: 0,
                title: 'Unknown',
            });
        }
        nextSlide(){
            if (this.state.activeVideo === this.videoList.length - 1) {
                this.state.activeVideo = 0;
                return;
            }
            this.state.activeVideo = this.state.activeVideo + 1;
        }
        prevSlide(){
            if (this.state.activeVideo === 0) {
                this.state.activeVideo = this.videoList.length - 1;
                return;
            }
            this.state.activeVideo = this.state.activeVideo - 1;
        }
        get videoList(){
            return this.env.pos.adVideoList ? this.env.pos.adVideoList : [];
        }
        get width(){
            return this.props.width;
        }
        get videoSrc(){
            if(this.videoList[this.state.activeVideo].is_youtube_video){
                if(this.videoList[this.state.activeVideo].name){
                    this.state.title = this.videoList[this.state.activeVideo].name;
                }
                return "https://www.youtube.com/embed/"+this.videoList[this.state.activeVideo].video_id + "?autoplay=1";
            }else{
                if(this.videoList[this.state.activeVideo].name){
                    this.state.title = this.videoList[this.state.activeVideo].name;
                }
                return "data:video/mp4;base64," + this.videoList[this.state.activeVideo].local_video_id; 
            }
        }
    }
    VideoSlider.template = 'VideoSlider';

    Registries.Component.add(VideoSlider);

    return VideoSlider;
});
