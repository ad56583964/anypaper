let DEBUG_INFO = console.log;

export default class PencilTool {
    constructor(table){
        DEBUG_INFO("Init PencilTool");
    }

    activate(){
        DEBUG_INFO("PencilTool activate");
    }

    deactivate(){
        DEBUG_INFO("PencilTool deactivate");
    }

    pointermove(e){
        DEBUG_INFO("PencilTool pointermove");
    }
}
