import React from 'react';
import {
  View,
  Image,
} from 'react-native';

import { H2, Caption2 } from '../../components/ui-kit/typography';
import cloudinaryUrl from '../../utils/cloudinary-utils';

type Props = {
  aspectRatio: number,
  cloudinaryPublicId: string,
  cloudinaryImageVersion: number,
  targetUserUid: string,
}

export default class MapPanelSelfieUploadedByMe extends React.Component<Props> {
  render() {
    return (
      <View>
        <View>
          <View style={{
            marginTop: 8,
            flexDirection: 'row',
          }}
          >
            <View
              style={{
                height: 112,
                aspectRatio: this.props.aspectRatio,
              }}
            >
              <Image
                style={{
                  height: 112,
                  alignSelf: 'flex-start',
                  aspectRatio: this.props.aspectRatio,
                  borderRadius: 4,
                }}
                source={{
                  uri: cloudinaryUrl({
                    publicId: `microDates/${this.props.cloudinaryPublicId}`,
                    version: this.props.cloudinaryImageVersion,
                  }, {
                      height: 112,
                      crop: 'scale',
                    }),
                }}
              />
            </View>
            <View style={{
              flex: 1,
              flexDirection: 'column',
              marginLeft: 16,
            }}
            >
              <H2>
                Фото загружено!
              </H2>
              <Caption2
                style={{
                  marginTop: 8,
                }}
              >
                Ожидаю подтверждения встречи от {this.props.targetUserUid.substring(0, 4)}.
              </Caption2>
            </View>
          </View>
        </View>
      </View>
    );
  }
}
